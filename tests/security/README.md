# ByteMe security regression

The **ZAP regression** job tests the anonymous Swagger HTML response for an effective
anti-framing policy. It builds ByteMe at the GitHub event SHA. A pull request tests the
generated merge commit and records the PR head and base SHAs separately. The check covers
this one HTTP response and its framing headers.

## Run locally

Use Docker, Python 3.13, Git, and OpenSSL. Check out ByteMe and
[testing-tool](https://github.com/hehuanglu/testing-tool) as siblings. Check out the
testing-tool SHA in the runtime checkout step of the
[workflow](../../.github/workflows/security-regression.yml). Keep both trees clean.

```sh
product="$(pwd -P)" # Run from the ByteMe repository root.
runner="$(cd ../testing-tool && pwd -P)"
out="$(mktemp -d)"
bash "$runner/tests/security/run_zap_product_suite.sh" \
  --cases "$product/tests/security/cases" --product-source "$product" \
  --expected-product-sha "$(git -C "$product" rev-parse HEAD)" \
  --require-cases --variant upstream-original --deadline 600 --out "$out"
```

## Read the check

- `PASS` means ZAP read back the expected Swagger response and the policy matched.
- `REGRESSION` means the exact expected response was observed and its policy failed the assertion.
- `MISSING_EVIDENCE` means the required response or a conclusive policy witness was unavailable.
- `EXECUTION_ERROR` means admission, build, startup, ZAP or cleanup failed.

Open the **Security regression** run and its **ZAP regression** job summary. Download the
`zap-regression-<run_id>-<attempt>-zap-regression` artifact within 14 days. Start with
`suite-results.json`, `summary.md` and `junit.xml`. Per-case folders hold identity,
cleanup and filtered ZAP response evidence. Build, readiness and scanner diagnostics are
separate and contain stage exits. A setup failure before suite execution produces
`bootstrap.json`. Review the run's steps and rerun the failed job after an infrastructure
failure. Reruns retain the event SHA and increment the attempt number.

## Maintain cases and the runner

- Add one reviewed case per `cases/<id>.json`. In testing-tool, use `zap-assessment regression
  generate` with the approved v3 RUN and mapping, then run `zap-assessment regression promote
  --case <v1-case.json> --target-mode event-checkout --out-dir <ByteMe>/tests/security/cases`.
  Promotion preserves the reviewed source, requests and assertion while recording the v1 digest.
- Update a case by reviewing the candidate diff and committing the accepted JSON. Promotion
  prints a changed candidate for review and preserves the existing file.
- Remove a case by deleting its JSON file. Deleting the last case fails the check with
  `EMPTY_SUITE`.
- Upgrade testing-tool in a dedicated PR. Verify the published full SHA on the
  testing-tool qualification workflows, then change the single runtime checkout `ref`
  in the ByteMe workflow and verify the ByteMe push and PR checks.
