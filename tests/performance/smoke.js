import http from "k6/http";
import { check, group, sleep } from "k6";

const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:8080";

export const options = {
  scenarios: {
    catalog_smoke: {
      executor: "constant-vus",
      vus: Number(__ENV.SMOKE_VUS || 3),
      duration: __ENV.SMOKE_DURATION || "20s",
      gracefulStop: "5s",
    },
  },
  thresholds: {
    checks: ["rate==1"],
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500", "p(99)<1200"],
    "http_req_duration{name:GET /api/foods}": ["p(95)<500"],
    "http_req_duration{name:GET /api/foods/search}": ["p(95)<500"],
    "http_req_duration{name:GET /api/foods/:id}": ["p(95)<500"],
  },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

export function setup() {
  const health = http.get(`${baseUrl}/actuator/health`, {
    tags: { name: "GET /actuator/health" },
  });

  if (!check(health, { "application is ready": (response) => response.status === 200 })) {
    throw new Error(`ByteMe is not ready: HTTP ${health.status}`);
  }
}

export default function () {
  group("public catalog", () => {
    const catalog = http.get(`${baseUrl}/api/foods`, {
      tags: { name: "GET /api/foods" },
    });
    check(catalog, {
      "catalog returns 200": (response) => response.status === 200,
      "catalog returns seeded foods": (response) => {
        try {
          return response.json().length >= 1;
        } catch (_) {
          return false;
        }
      },
    });

    const search = http.get(`${baseUrl}/api/foods/search?q=ph%E1%BB%9F`, {
      tags: { name: "GET /api/foods/search" },
    });
    check(search, {
      "search returns 200": (response) => response.status === 200,
      "search returns a matching food": (response) => {
        try {
          return response.json().some((food) => food.name.toLowerCase().includes("phở"));
        } catch (_) {
          return false;
        }
      },
    });

    const detail = http.get(`${baseUrl}/api/foods/1`, {
      tags: { name: "GET /api/foods/:id" },
    });
    check(detail, {
      "food detail returns 200": (response) => response.status === 200,
      "food detail returns requested id": (response) => {
        try {
          return response.json().id === 1;
        } catch (_) {
          return false;
        }
      },
    });
  });

  sleep(0.2);
}

export function handleSummary(data) {
  return {
    "reports/performance/smoke-summary.json": JSON.stringify(data, null, 2),
  };
}
