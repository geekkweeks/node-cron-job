package controller

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-module/carbon/v2"
	"github.com/trendreader/instagram-csv-receiver/db"
	"github.com/trendreader/instagram-csv-receiver/helper"
	"github.com/trendreader/instagram-csv-receiver/model"
	"gorm.io/gorm"
)

func CsvConvert(writer http.ResponseWriter, request *http.Request) {
	posted, err := helper.DecodePost(request)
	if err != nil {
		helper.ResponseError(writer, http.StatusInternalServerError, err.Error())
		return
	}

	if posted["file"] != nil {
		fname := fmt.Sprint(posted["file"])
		src := os.Getenv("TMP_PATH") + "/" + fname

		if _, err := os.Stat(src); err != nil {
			helper.ResponseError(writer, http.StatusBadRequest, err.Error())
			return
		}

		f, err := os.Open(src)
		if err != nil {
			helper.ResponseError(writer, http.StatusBadRequest, err.Error())
			return
		}

		defer f.Close()

		sname := strings.Split(fname, "_")

		creds := db.Connect(os.Getenv("DB_BASE_CREDS"))
		//ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		ctx := context.Background()
		//defer cancel()

		var lists []map[string]interface{}
		var entity map[string]interface{}

		tx := creds.WithContext(ctx).Model(&model.Entity{}).Select("ent_src_id").Where("ent_media_id = ? AND ent_word LIKE ? ", os.Getenv("MEDIA_ID"), sname[2])
		tx.First(&entity)

		if entity == nil {
			helper.ResponseError(writer, http.StatusInternalServerError, "Invalid keyword. Try again or set new keyword..")
			return
		}

		var search map[string]interface{}
		tx = creds.WithContext(ctx).Model(&model.Search{}).Select("src_id, src_client_id, src_cluster_id, src_title")
		tx.First(&search, entity["ent_src_id"])

		if search == nil {
			helper.ResponseError(writer, http.StatusInternalServerError, "Invalid search cluster. Try again or set new cluster..")
			return
		}

		csvr := csv.NewReader(f)
		data, err := csvr.ReadAll()
		if err != nil {
			helper.ResponseError(writer, http.StatusBadRequest, err.Error())
			return
		}

		ids := helper.GetSeveralIds(len(data))

		for i, rows := range data {
			if i > 0 {
				list := make(map[string]interface{})
				list["stream_id"] = ids[i]
				list["stream_client_id"] = search["src_client_id"]
				list["stream_cluster_id"] = search["src_cluster_id"]
				list["stream_src_id"] = search["src_id"]
				list["stream_media_id"] = os.Getenv("MEDIA_ID")

				var keyword []string
				keyword = append(keyword, sname[2])
				list["stream_search"] = keyword

				list["stream_source_id"] = helper.Trimmer(rows[0])

				itgl, _ := strconv.ParseInt(rows[2], 10, 64)
				list["stream_source_date"] = time.Unix(itgl, 0)
				list["stream_source_detail"] = helper.Trimmer(rows[3])
				list["stream_source_url"] = helper.Trimmer(rows[7])
				list["stream_source_tone"] = "Neutral"

				views := 0

				if len(rows) > 12 {
					list["stream_user_name"] = helper.Trimmer(rows[14])
					list["stream_user_alias"] = helper.Trimmer(rows[13])
				} else {
					list["stream_user_alias"] = helper.Trimmer(rows[11])
					views, _ = strconv.Atoi(rows[10])
				}

				likes, _ := strconv.Atoi(rows[5])
				comment, _ := strconv.Atoi(rows[6])
				list["stream_source_meta"] = map[string]interface{}{
					"likes":    likes,
					"comments": comment,
					"views":    views,
				}

				list["stream_source_engage"] = likes + comment + views
				list["stream_analysed"] = "simple"
				list["stream_alert"] = "No"
				list["stream_uploaded"] = "No"
				list["stream_status"] = "Active"

				if posted["date"] != nil {

					loc, err := time.LoadLocation("Asia/Jakarta")
					if err != nil {
						helper.ResponseError(writer, http.StatusInternalServerError, err.Error())
						return
					}
					stgl := carbon.Parse(fmt.Sprint(posted["date"])).ToStdTime().In(loc).String()
					dtgl := list["stream_source_date"].(time.Time).In(loc).String()

					fmt.Println("|", stgl[0:10], " = ", dtgl[0:10])
					if stgl[0:10] == dtgl[0:10] {
						lists = append(lists, list)
					}
					// if stgl.Truncate(24 * time.Hour).Equal(dtgl.Truncate(24 * time.Hour)) {
					// 	lists = append(lists, list)
					// }
				} else {
					lists = append(lists, list)
				}
			}
		}

		if posted["save"] != nil {
			prods := db.Connect(os.Getenv("DB_BASE_PRODS"))

			for _, list := range lists {
				var feed map[string]interface{}
				err = prods.Model(&model.Feeds{}).WithContext(ctx).Where("stream_source_url LIKE ?", list["stream_source_url"]).First(&feed).Error

				searches, _ := json.Marshal(list["stream_search"])
				meta, _ := json.Marshal(list["stream_source_meta"])

				if errors.Is(err, gorm.ErrRecordNotFound) {
					list["stream_search"] = string(searches)
					list["stream_source_meta"] = string(meta)
					list["stream_source_date"] = carbon.Parse(fmt.Sprint(list["stream_source_date"])).ToStdTime()
					list["stream_user_creator"] = "2018031912490739"
					list["stream_user_created"] = time.Now()

					if err := prods.WithContext(ctx).Model(&model.Feeds{}).Create(list).Error; err != nil {
						helper.ResponseError(writer, http.StatusInternalServerError, err.Error())
						return
					}
				} else {
					feed["stream_search"] = string(searches)
					feed["stream_source_meta"] = string(meta)
					feed["stream_source_date"] = carbon.Parse(fmt.Sprint(list["stream_source_date"])).ToStdTime()
					feed["stream_source_engage"] = list["stream_source_engage"]
					feed["stream_user_updater"] = "2018031912490739"
					feed["stream_user_updated"] = time.Now()
					id := feed["stream_id"]
					delete(feed, "stream_id")

					if err := prods.WithContext(ctx).Model(&model.Feeds{}).Where("stream_id = ?", id).Updates(feed).Error; err != nil {
						helper.ResponseError(writer, http.StatusInternalServerError, err.Error())
						return
					}
				}
			}

			var payload = map[string]interface{}{
				"success": true,
			}

			helper.ResponseSuccess(writer, payload)
			return

		} else {
			var payload = map[string]interface{}{
				"lists": lists,
			}

			helper.ResponseSuccess(writer, payload)
			return
		}
	} else {
		helper.ResponseError(writer, http.StatusBadRequest, "Invalid file..")
		return
	}
}
