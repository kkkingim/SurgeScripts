const AreaAvailableID = 80018499;
const SelfMadeAvailableID = 80197526;
const NonSelfMadeAvailableID = 70143836;

function statusName(status) {
  return status == 2
    ? "即将登陆"
    : status == 1
    ? "已解锁"
    : status == 0
    ? "不解锁"
    : status == -1
    ? "检测超时"
    : "检测异常";
}

function testPublicGraphqlAPI(accessToken) {
  return new Promise((resolve, reject) => {
    let opts = {
      url: "https://disney.api.edge.bamgrid.com/v1/public/graphql",
      headers: {
        "Accept-Language": "en",
        Authorization: accessToken,
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36",
      },
      body: JSON.stringify({
        query:
          "query($preferredLanguages: [String!]!, $version: String) {globalization(version: $version) { uiLanguage(preferredLanguages: $preferredLanguages) }}",
        variables: { version: "1.5.0", preferredLanguages: ["en"] },
      }),
    };

    $httpClient.post(opts, function (error, response, data) {
      if (error) {
        reject("Error");
        return;
      }
      resolve(response.status === 200);
    });
  });
}

function getLocationInfo() {
  return new Promise((resolve, reject) => {
    let opts = {
      url: "https://disney.api.edge.bamgrid.com/graph/v1/device/graphql",
      headers: {
        "Accept-Language": "en",
        Authorization:
          "ZGlzbmV5JmJyb3dzZXImMS4wLjA.Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84",
        "Content-Type": "application/json",
        "User-Agent": UA,
      },
      body: JSON.stringify({
        query:
          "mutation registerDevice($input: RegisterDeviceInput!) { registerDevice(registerDevice: $input) { grant { grantType assertion } } }",
        variables: {
          input: {
            applicationRuntime: "chrome",
            attributes: {
              browserName: "chrome",
              browserVersion: "94.0.4606",
              manufacturer: "apple",
              model: null,
              operatingSystem: "macintosh",
              operatingSystemVersion: "10.15.7",
              osDeviceIds: [],
            },
            deviceFamily: "browser",
            deviceLanguage: "en",
            deviceProfile: "macosx",
          },
        },
      }),
    };

    $httpClient.post(opts, function (error, response, data) {
      if (error) {
        reject("Error");
        return;
      }

      if (response.status !== 200) {
        console.log("getLocationInfo: " + data);
        reject("Not Available");
        return;
      }

      data = JSON.parse(data);
      if (data?.errors) {
        console.log("getLocationInfo: " + data);
        reject("Not Available");
        return;
      }

      let {
        token: { accessToken },
        session: {
          inSupportedLocation,
          location: { countryCode },
        },
      } = data?.extensions?.sdk;
      resolve({ inSupportedLocation, countryCode, accessToken });
    });
  });
}

function testHomePage() {
  return new Promise((resolve, reject) => {
    let opts = {
      url: "https://www.disneyplus.com/",
      headers: {
        "Accept-Language": "en",
        "User-Agent": UA,
      },
    };

    $httpClient.get(opts, function (error, response, data) {
      if (error) {
        reject("Error");
        return;
      }
      if (
        response.status !== 200 ||
        data.indexOf("Sorry, Disney+ is not available in your region.") !== -1
      ) {
        reject("Not Available");
        return;
      }

      let match = data.match(/Region: ([A-Za-z]{2})[\s\S]*?CNBL: ([12])/);
      if (!match) {
        resolve({ region: "", cnbl: "" });
        return;
      }

      let region = match[1];
      let cnbl = match[2];
      resolve({ region, cnbl });
    });
  });
}

function timeout(delay = 5000) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject("Timeout");
    }, delay);
  });
}

async function test() {
  try {
    let { region, cnbl } = await Promise.race([testHomePage(), timeout(3000)]);

    let { countryCode, inSupportedLocation, accessToken } = await Promise.race([
      getLocationInfo(),
      timeout(3000),
    ]);

    region = countryCode ?? region;
    // 即将登陆
    if (inSupportedLocation === false || inSupportedLocation === "false") {
      return { region, status: STATUS_COMING };
    }

    let support = await Promise.race([
      testPublicGraphqlAPI(accessToken),
      timeout(3000),
    ]);
    if (!support) {
      return { status: STATUS_NOT_AVAILABLE };
    }
    // 支持解锁
    return { region, status: STATUS_AVAILABLE };
  } catch (error) {
    console.log(error);

    // 不支持解锁
    if (error === "Not Available") {
      return { status: STATUS_NOT_AVAILABLE };
    }

    // 检测超时
    if (error === "Timeout") {
      return { status: STATUS_TIMEOUT };
    }

    return { status: STATUS_ERROR };
  }
}

(async () => {
  let panel = {
    title: "DisneyPlus 解锁测试",
  };

  let { region, status } = await test();

  switch (status) {
    case 2:
      panel["content"] = `❀ 完整解锁：${region}`;
      panel["icon"] = "checkmark.shield";
      panel["icon-color"] = "#1B813E";
      break;
    case 1:
      panel["content"] = `❀ 即将上线: ${region}`;
      panel["icon"] = "exclamationmark.shield";
      panel["icon-color"] = "#EFBB24";
      break;
    case 0:
      panel["content"] = `❀ 不支持解锁`;
      panel["icon"] = "xmark.shield";
      panel["icon-color"] = "#CB1B45";
      break;
    default:
      panel["content"] = `❀ 网络连接失败`;
      panel["icon"] = "exclamationmark.arrow.triangle.2.circlepath";
      panel["icon-color"] = "#77428D";
      break;
  }

  $done(panel);

  return;
})();
