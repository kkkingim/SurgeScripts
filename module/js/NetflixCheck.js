const AreaAvailableID = 80018499;
const SelfMadeAvailableID = 80197526;
const NonSelfMadeAvailableID = 70143836;

function test(filmId) {
  return new Promise((resolve, reject) => {
    let option = {
      url: "https://www.netflix.com/title/" + filmId,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36",
      },
    };
    $httpClient.get(option, function (error, response, data) {
      if (error != null) {
        reject("Error");
        return;
      }

      if (response.status === 403) {
        reject("Not Available");
        return;
      }

      if (response.status === 404) {
        resolve("Not Found");
        return;
      }

      if (response.status === 200) {
        let url = response.headers["x-originating-url"];
        let region = url.split("/")[3];
        region = region.split("-")[0];
        if (region == "title") {
          region = "us";
        }
        resolve(region);
        return;
      }

      reject("Error");
    });
  });
}

(async () => {
  let result = {
    title: "Netflix 影劇版權 IP 鎖測試",
    icon: "exclamationmark.arrow.triangle.2.circlepath",
    "icon-color": "#77428D",
    content: "測試失敗，請檢查網路狀態",
  };
  await test(NonSelfMadeAvailableID)
    .then((code) => {
      if (code === "Not Found") {
        return test(SelfMadeAvailableID);
      }
      result["Title"] = "Netflix 影劇版權 IP 鎖測試";
      result["icon"] = "checkmark.shield";
      result["icon-color"] = "#1B813E";
      //result['icon'] = params.icon1
      //result['icon-color'] = params.color1
      result["content"] =
        "目前 IP 可完整收看 Netflix 影劇\n解鎖國家：" + code.toUpperCase();
      return Promise.reject("BreakSignal");
    })
    .then((code) => {
      if (code === "Not Found") {
        return Promise.reject("Not Available");
      }
      result["Title"] = "Netflix 影劇版權 IP 鎖測試";
      result["icon"] = "exclamationmark.shield";
      result["icon-color"] = "#EFBB24";
      //result['icon'] = params.icon2
      //result['icon-color'] = params.color2
      result["content"] =
        "目前 IP 僅支援收看 Netflix 自製劇\n解鎖國家：" + code.toUpperCase();
      return Promise.reject("BreakSignal");
    })
    .catch((error) => {
      if (error === "Not Available") {
        result["Title"] = "Netflix 影劇版權 IP 鎖測試";
        result["icon"] = "xmark.shield";
        result["icon-color"] = "#CB1B45";
        //result['icon'] = params.icon3
        //result['icon-color'] = params.color3
        result["content"] = "Netflix 不為此 IP 提供服務";
        return;
      }
    })
    .finally(() => {
      $done(result);
    });
})();
