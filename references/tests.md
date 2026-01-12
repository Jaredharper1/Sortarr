# Tests

## smoke_test.py
- Basic API and UI smoke checks.
- Requires configured env (ENV_FILE_PATH or data/Sortarr.env).

## selenium_stress_test.py
- UI stress test for large tables.
- Requires Selenium + browser/driver.

## tautulli_id_match_test.py
- Reports match coverage against Tautulli data.
- Useful env:
  - ENV_FILE_PATH=...\data\Sortarr.env
  - SORTARR_ID_MATCH_VERBOSE=1 (full list)
