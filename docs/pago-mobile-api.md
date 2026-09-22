# Pago consumer mobile API

Extracted from the Android APK `Pago.apk` (Play package `ro.pagoplateste.pago`, live `4.17.0` build `702`).

This is the **consumer app API** against `https://pago.cloud`, not the partner / BT Pay white-label API in [`pago-partner-api.md`](pago-partner-api.md).

Method: DEX string tables + Retrofit `@GET`/`@POST`/`@PUT`/`@PATCH`/`@DELETE` annotations on `app.pago.*` and `ro.pagoplateste.pago.main.*` interfaces. Method names are obfuscated; paths are not.

## Hosts

| Host | Role |
| --- | --- |
| `https://pago.cloud/` | Main REST host |
| `https://pago.cloud/authentication/` | OAuth Retrofit `baseUrl` (see Auth) |
| `https://assets.pago.ro/` | Static assets (provider logos, SDK UI config, lottie) |
| `https://www.secure11gw.ro/portal/cgi-bin/` | Romcard card gateway |
| `https://pago.loto.ro` | Lotto landing |
| `https://logs-01.loggly.com/` | Client logs (`POST inputs/{token}`) |

Asset paths also include `https://assets.pago.ro/sdk/{brand}/uiConfig`, `https://assets.pago.ro/provider_logos/`, `https://assets.pago.ro/payments/device_fingerprint.html`.

## Auth and headers

Login is Retrofit `POST uaa/oauth/token` on base `https://pago.cloud/authentication/`, i.e. full path:

`POST https://pago.cloud/authentication/uaa/oauth/token`

Form fields: `grant_type`, `username`, `password`. Headers on that call: `Authorization` (HTTP Basic), `User-Agent`, `Phone-Id`, `Phone-Details`. Content type `application/x-www-form-urlencoded`.

App-wide request headers seen in the binary: `Authorization` (Bearer), `Phone-Id`, `Session-Id`, `AppId`, `User-Agent` (`Pago/…`), `Country`, `Accept-Language`.

Related profile calls (absolute on the host):

- `GET /authentication/uaa/v1.00/user_profile`
- `PUT /authentication/uaa/v1.00/update_profile`

## How Retrofit paths resolve

- A path that **starts with `/`** replaces the URL path and stays on `https://pago.cloud`.
- A path **without a leading slash** is appended to that Retrofit client's `baseUrl`.
- Bills interfaces use relative `bills/…`. Combined with the absolute `GET /sdk/bills/accounts/summary` and the Rent Manager client, those resolve as `/sdk/bills/…`.
- Auth uses relative `uaa/oauth/token` on `https://pago.cloud/authentication/`.
- Short names such as `extrainfo`, `active`, `subscribe`, `cards` keep a per-module `baseUrl` that is **not** a string constant in the APK (built at runtime). A leading `/` in **Resolved** for those is a guess.

The **Resolved** column prefixes `/sdk/` for `bills/…` and `/authentication/` for `uaa/…`. Host-rooted prefixes (`/payment/`, `/pago-…`, `/pos_v1_1/`, `/rca/`, …) get a leading `/`. `—` means the client `baseUrl` was not in the binary.

## Rent Manager overlap

Paths already used by `src/pago.js`:

| Method | Path |
| --- | --- |
| POST | `/authentication/uaa/oauth/token` |
| GET | `/sdk/bills/accounts/summary` |
| GET | `/sdk/bills/providers` |
| POST | `/sdk/bills/accounts` |
| GET | `/payment/payment-details-v2` |
| GET | `/payment/transactions` (string in the APK; no Retrofit `@GET` on that exact path) |
| PATCH | `/sdk/bills/locations/{id}` (annotation `PATCH bills/locations/{id}`) |

## Bundled GraphQL schema (no HTTP endpoint found)

The APK ships `assets/graphql/schema.graphqls` (`Account`, `Location`, `Invoice` plus queries `accountById`, `accountActiveByUsernameAndUri`, `accountsForPrincipal`, `accountsForPrincipalCreatedAtBetweenAndLastModifiedBetween`). No `graphql` URL or Retrofit method was in the DEX strings. Treat as unused / leftover unless a runtime URL is injected.

## Auth & profile

_46 unique method + path_

| Method | Annotated path | Resolved | Query / notes |
| --- | --- | --- | --- |
| `POST` | `uaa/oauth/token` | `/authentication/uaa/oauth/token` | form: grant_type, username, password; x-www-form-urlencoded |
| `PUT` | `/authentication/uaa/v1.00/update_profile` | `/authentication/uaa/v1.00/update_profile` |  |
| `GET` | `/authentication/uaa/v1.00/user_profile` | `/authentication/uaa/v1.00/user_profile` |  |
| `POST` | `/pos-user/analytics` | `/pos-user/analytics` |  |
| `POST` | `pos-user/authorizeDevice/{pin}` | `/pos-user/authorizeDevice/{pin}` |  |
| `POST` | `/pos-user/billingAddresses/` | `/pos-user/billingAddresses/` |  |
| `GET` | `/pos-user/btpay/migrationCode` | `/pos-user/btpay/migrationCode` |  |
| `POST` | `/pos-user/deep-link/password` | `/pos-user/deep-link/password` |  |
| `POST` | `pos-user/defaultUserAddress/` | `/pos-user/defaultUserAddress/` |  |
| `DELETE` | `pos-user/deleteUserAddress/{id}` | `/pos-user/deleteUserAddress/{id}` |  |
| `POST` | `/pos-user/forgot/{pos_uuid}` | `/pos-user/forgot/{pos_uuid}` | query: dlink |
| `GET` | `/pos-user/getUserAddresses` | `/pos-user/getUserAddresses` |  |
| `GET` | `pos-user/has_pin/` | `/pos-user/has_pin/` |  |
| `POST` | `/pos-user/magic-link` | `/pos-user/magic-link` |  |
| `GET` | `/pos-user/pin/{posUUID}` | `/pos-user/pin/{posUUID}` |  |
| `DELETE` | `/pos-user/pin/{pos_uuid}` | `/pos-user/pin/{pos_uuid}` | query: forgot |
| `POST` | `pos-user/saveOrUpdateUserAddress` | `/pos-user/saveOrUpdateUserAddress` |  |
| `POST` | `/pos-user/settings/password` | `/pos-user/settings/password` |  |
| `POST` | `/pos-user/verify_pin` | `/pos-user/verify_pin` |  |
| `GET` | `/pos_v1_1/configuration/check_compatibility/{versionName}/{uuid}` | `/pos_v1_1/configuration/check_compatibility/{versionName}/{uuid}` |  |
| `GET` | `/pos_v1_1/configuration/user_settings` | `/pos_v1_1/configuration/user_settings` |  |
| `PUT` | `/pos_v1_1/configuration/user_settings` | `/pos_v1_1/configuration/user_settings` |  |
| `PUT` | `/pos_v1_1/enrolment/campaigns/huawei/{pos}` | `/pos_v1_1/enrolment/campaigns/huawei/{pos}` |  |
| `PUT` | `/pos_v1_1/enrolment/campaigns/olx/{pos}` | `/pos_v1_1/enrolment/campaigns/olx/{pos}` |  |
| `PUT` | `/pos_v1_1/enrolment/notification_service_firebase/{uuid}/{token}/{localCode}` | `/pos_v1_1/enrolment/notification_service_firebase/{uuid}/{token}/{localCode}` |  |
| `PUT` | `/pos_v1_1/enrolment/notification_service_huawei/{uuid}/{token}/{localCode}` | `/pos_v1_1/enrolment/notification_service_huawei/{uuid}/{token}/{localCode}` |  |
| `POST` | `/pos_v1_1/enrolment/pos` | `/pos_v1_1/enrolment/pos` |  |
| `POST` | `/pos_v1_1/enrolment/pos-user-country/{posUUID}/{countryCode}` | `/pos_v1_1/enrolment/pos-user-country/{posUUID}/{countryCode}` |  |
| `PUT` | `pos_v1_1/enrolment/providerds/{uuid}` | `/pos_v1_1/enrolment/providerds/{uuid}` |  |
| `PUT` | `/pos_v1_1/enrolment/referrer-code` | `/pos_v1_1/enrolment/referrer-code` |  |
| `POST` | `/pos_v1_1/enrolment/register-device` | `/pos_v1_1/enrolment/register-device` |  |
| `DELETE` | `pos_v1_1/enrolment/user/{uuid}` | `/pos_v1_1/enrolment/user/{uuid}` |  |
| `POST` | `/pos_v1_1/enrolment/user/{uuid}` | `/pos_v1_1/enrolment/user/{uuid}` |  |
| `DELETE` | `pos_v1_1/enrolment/user/{uuid}/{shouldSkipAnon}` | `/pos_v1_1/enrolment/user/{uuid}/{shouldSkipAnon}` |  |
| `GET` | `/pos_v1_1/enrolment/valid-device/{phoneId}/{mac}` | `/pos_v1_1/enrolment/valid-device/{phoneId}/{mac}` |  |
| `POST` | `/pos_v1_1/user/key` | `/pos_v1_1/user/key` |  |
| `POST` | `/pos_v1_1/user/phone/validation` | `/pos_v1_1/user/phone/validation` |  |
| `PUT` | `/pos_v1_1/user/phone/validation` | `/pos_v1_1/user/phone/validation` |  |
| `POST` | `/pos_v1_1/user/points-informed` | `/pos_v1_1/user/points-informed` |  |
| `GET` | `/pos_v1_1/user/sca` | `/pos_v1_1/user/sca` |  |
| `GET` | `/pos_v1_1/user/sca/enrol` | `/pos_v1_1/user/sca/enrol` |  |
| `POST` | `/pos_v1_1/user/sca/enrol` | `/pos_v1_1/user/sca/enrol` |  |
| `GET` | `/pos_v1_1/user/sca/session` | `/pos_v1_1/user/sca/session` |  |
| `POST` | `/pos_v1_1/user/sca/session` | `/pos_v1_1/user/sca/session` |  |
| `GET` | `/pos_v1_1/users/settings` | `/pos_v1_1/users/settings` |  |
| `PUT` | `/pos_v1_1/users/settings` | `/pos_v1_1/users/settings` |  |

## Bills / invoices / suppliers (SDK)

_24 unique method + path_

| Method | Annotated path | Resolved | Query / notes |
| --- | --- | --- | --- |
| `GET` | `extrainfo` | `/extrainfo` |  |
| `POST` | `extrainfo` | `/extrainfo` |  |
| `GET` | `bills/accounts` | `/sdk/bills/accounts` |  |
| `POST` | `bills/accounts` | `/sdk/bills/accounts` |  |
| `GET` | `/sdk/bills/accounts/summary` | `/sdk/bills/accounts/summary` |  |
| `DELETE` | `bills/accounts/{id}` | `/sdk/bills/accounts/{id}` |  |
| `GET` | `bills/accounts/{id}` | `/sdk/bills/accounts/{id}` |  |
| `POST` | `bills/accounts/{uri}` | `/sdk/bills/accounts/{uri}` |  |
| `GET` | `bills/history` | `/sdk/bills/history` |  |
| `GET` | `bills/invoices/{billId}/pdf` | `/sdk/bills/invoices/{billId}/pdf` | streaming PDF/bytes |
| `DELETE` | `bills/invoices/{id}` | `/sdk/bills/invoices/{id}` |  |
| `POST` | `bills/invoices/{providerUri}` | `/sdk/bills/invoices/{providerUri}` |  |
| `DELETE` | `bills/locations/{id}` | `/sdk/bills/locations/{id}` |  |
| `PATCH` | `bills/locations/{id}` | `/sdk/bills/locations/{id}` |  |
| `PUT` | `bills/locations/{id}` | `/sdk/bills/locations/{id}` |  |
| `GET` | `bills/providers` | `/sdk/bills/providers` |  |
| `GET` | `bills/providers/top-crawled` | `/sdk/bills/providers/top-crawled` |  |
| `GET` | `bills/providers/top-scanned` | `/sdk/bills/providers/top-scanned` |  |
| `GET` | `bills/providers/types` | `/sdk/bills/providers/types` |  |
| `GET` | `bills/providers/{uri}` | `/sdk/bills/providers/{uri}` | query: barcode |
| `GET` | `bills/static` | `/sdk/bills/static` |  |
| `GET` | `bills/v1/providers/{uri}/auth0/authorize` | `/sdk/bills/v1/providers/{uri}/auth0/authorize` |  |
| `GET` | `bills/v1/providers/{uri}/auth0/status/{state}` | `/sdk/bills/v1/providers/{uri}/auth0/status/{state}` |  |
| `DELETE` | `/sdk/user` | `/sdk/user` |  |

## Payments & cards

_58 unique method + path_

| Method | Annotated path | Resolved | Query / notes |
| --- | --- | --- | --- |
| `GET` | `debt/payment-pdf/{orderNumber}/{accountId}` | `/debt/payment-pdf/{orderNumber}/{accountId}` |  |
| `POST` | `debt/send-payment-result` | `/debt/send-payment-result` |  |
| `GET` | `pago-bridge-toll/bridge-toll/status/{id}` | `/pago-bridge-toll/bridge-toll/status/{id}` |  |
| `POST` | `pago-bridge-toll/bridge-toll/{payableEntityId}` | `/pago-bridge-toll/bridge-toll/{payableEntityId}` |  |
| `POST` | `pago-donation/ngos/settings` | `/pago-donation/ngos/settings` |  |
| `GET` | `pago-donation/status/{id}` | `/pago-donation/status/{id}` |  |
| `GET` | `/pago-ecommerce/status/{id}` | `/pago-ecommerce/status/{id}` |  |
| `GET` | `pago-epingaming/voucher/{id}` | `/pago-epingaming/voucher/{id}` |  |
| `GET` | `pago-freemium/subscription/status/{subscriptionId}` | `/pago-freemium/subscription/status/{subscriptionId}` |  |
| `GET` | `pago-insurance/pad/status/{padId}` | `/pago-insurance/pad/status/{padId}` |  |
| `GET` | `pago-insurance/policy_issue_status/{id}` | `/pago-insurance/policy_issue_status/{id}` |  |
| `GET` | `pago-insurance/status/{id}` | `/pago-insurance/status/{id}` |  |
| `GET` | `pago-insurance/travel/policy_issue_status/{id}` | `/pago-insurance/travel/policy_issue_status/{id}` |  |
| `GET` | `pago-insurance/travel/status/{id}` | `/pago-insurance/travel/status/{id}` |  |
| `POST` | `pago-invoice/invoices` | `/pago-invoice/invoices` |  |
| `GET` | `pago-vignette/status/{id}` | `/pago-vignette/status/{id}` |  |
| `POST` | `pago-vignette/vignette/{payableEntityId}` | `/pago-vignette/vignette/{payableEntityId}` |  |
| `POST` | `payment/authorization` | `/payment/authorization` |  |
| `PUT` | `/payment/card/alias` | `/payment/card/alias` |  |
| `DELETE` | `payment/card/remove/{cardId}` | `/payment/card/remove/{cardId}` |  |
| `POST` | `/payment/card/replace/{oldCardId}/{newCardId}` | `/payment/card/replace/{oldCardId}/{newCardId}` |  |
| `GET` | `payment/cards` | `/payment/cards` |  |
| `POST` | `/payment/continue-3ds` | `/payment/continue-3ds` |  |
| `POST` | `payment/limit/validation` | `/payment/limit/validation` | query: limitType |
| `POST` | `/payment/pay` | `/payment/pay` |  |
| `POST` | `/payment/payment` | `/payment/payment` |  |
| `GET` | `payment/payment-details-v2` | `/payment/payment-details-v2` | query: paymentEntityType, size, page |
| `GET` | `payment/transactions` | `/payment/transactions` | string in DEX; no Retrofit `@GET` |
| `PUT` | `transaction/status` | `—` | bills PaymentApi |
| `GET` | `payment/poll/{mdOrder}` | `/payment/poll/{mdOrder}` |  |
| `PUT` | `payment/reconfirm_payment` | `/payment/reconfirm_payment` |  |
| `POST` | `payment/reset` | `/payment/reset` |  |
| `GET` | `payment/status/rca/{id}` | `/payment/status/rca/{id}` |  |
| `GET` | `pos_v1_1/prepay/recharge/{id}` | `/pos_v1_1/prepay/recharge/{id}` |  |
| `POST` | `/pos_v1_1/settings/autopayments` | `/pos_v1_1/settings/autopayments` |  |
| `GET` | `/pos_v1_1/settings/location/{location_id}/autopayments` | `/pos_v1_1/settings/location/{location_id}/autopayments` |  |
| `POST` | `romcard_v1_1/card/default/type` | `/romcard_v1_1/card/default/type` |  |
| `POST` | `sdk/payments/pago/v2/transactions` | `/sdk/payments/pago/v2/transactions` |  |
| `POST` | `sdk/payments/pago/v2/transactions/challenge` | `/sdk/payments/pago/v2/transactions/challenge` |  |
| `GET` | `sdk/payments/pago/v2/transactions/wallet/config` | `/sdk/payments/pago/v2/transactions/wallet/config` | query: entityType |
| `POST` | `sdk/payments/pago/v2/transactions/{entity}/reset` | `/sdk/payments/pago/v2/transactions/{entity}/reset` |  |
| `POST` | `sdk/payments/pago/v2/transactions/{entity}/status` | `/sdk/payments/pago/v2/transactions/{entity}/status` |  |
| `GET` | `(@Url)` | `—` | dynamic URL |
| `POST` | `./` | `—` | form: AMOUNT, CURRENCY, ORDER, DESC, MERCH_NAME, MERCH_URL, MERCHANT, TERMINAL, …; x-www-form-urlencoded |
| `GET` | `accounts` | `—` |  |
| `GET` | `cards` | `—` |  |
| `DELETE` | `cards/{id}` | `—` |  |
| `GET` | `failed-payment-subscription` | `—` |  |
| `POST` | `limits` | `—` |  |
| `GET` | `payment_card` | `—` |  |
| `PUT` | `payment_card` | `—` |  |
| `PUT` | `payment_card/{cardId}` | `—` |  |
| `POST` | `transactions` | `—` |  |
| `POST` | `transactions/{entity}/reset` | `—` |  |
| `POST` | `transactions/{entity}/status` | `—` |  |
| `POST` | `transactions?action=create` | `—` |  |
| `POST` | `transactions?action=pay` | `—` |  |
| `POST` | `{paymentFlow}/transactions/{entity}/status` | `—` |  |

## eSIM

_17 unique method + path_

| Method | Annotated path | Resolved | Query / notes |
| --- | --- | --- | --- |
| `GET` | `counties` | `/counties` | query: countryId |
| `GET` | `countries` | `/countries` |  |
| `GET` | `erste/invoice-details` | `/erste/invoice-details` |  |
| `POST` | `erste/invoice-details` | `/erste/invoice-details` |  |
| `PUT` | `erste/invoice-details` | `/erste/invoice-details` |  |
| `POST` | `erste/invoice-details/invoices` | `/erste/invoice-details/invoices` |  |
| `GET` | `packages` | `/packages` | query: country, region, global |
| `GET` | `packages/{packageId}` | `/packages/{packageId}` |  |
| `POST` | `/sdk/esim/v1/travel-xsell/claim` | `/sdk/esim/v1/travel-xsell/claim` |  |
| `GET` | `/sdk/esim/v1/travel-xsell/offer` | `/sdk/esim/v1/travel-xsell/offer` | query: country |
| `GET` | `user-packages` | `/user-packages` |  |
| `POST` | `user-packages` | `/user-packages` |  |
| `PUT` | `user-packages/{id}` | `/user-packages/{id}` |  |
| `GET` | `user-packages/{id}/topups` | `/user-packages/{id}/topups` |  |
| `GET` | `user-packages/{userPackageId}` | `/user-packages/{userPackageId}` |  |
| `GET` | `user-packages/{userPackageId}/invoices` | `/user-packages/{userPackageId}/invoices` |  |
| `GET` | `user-packages/{userPackageId}/invoices/{invoiceId}/pdf` | `/user-packages/{userPackageId}/invoices/{invoiceId}/pdf` | streaming PDF/bytes |

## Lotto

_16 unique method + path_

| Method | Annotated path | Resolved | Query / notes |
| --- | --- | --- | --- |
| `GET` | `/pago-loto/auto-tickets` | `/pago-loto/auto-tickets` | query: state |
| `POST` | `/pago-loto/auto-tickets` | `/pago-loto/auto-tickets` |  |
| `GET` | `/pago-loto/auto-tickets/eligible-cards` | `/pago-loto/auto-tickets/eligible-cards` |  |
| `POST` | `/pago-loto/auto-tickets/price-preview` | `/pago-loto/auto-tickets/price-preview` |  |
| `GET` | `/pago-loto/auto-tickets/{autoTicketId}` | `/pago-loto/auto-tickets/{autoTicketId}` |  |
| `PUT` | `/pago-loto/auto-tickets/{autoTicketId}` | `/pago-loto/auto-tickets/{autoTicketId}` |  |
| `POST` | `/pago-loto/auto-tickets/{autoTicketId}/deactivate` | `/pago-loto/auto-tickets/{autoTicketId}/deactivate` |  |
| `POST` | `/pago-loto/auto-tickets/{autoTicketId}/reactivate` | `/pago-loto/auto-tickets/{autoTicketId}/reactivate` |  |
| `GET` | `/pago-loto/games` | `/pago-loto/games` |  |
| `GET` | `/pago-loto/persons` | `/pago-loto/persons` |  |
| `GET` | `/pago-loto/player` | `/pago-loto/player` |  |
| `GET` | `/pago-loto/profile` | `/pago-loto/profile` | query: personUuid |
| `POST` | `/pago-loto/profile` | `/pago-loto/profile` |  |
| `POST` | `/pago-loto/tickets` | `/pago-loto/tickets` |  |
| `GET` | `/pago-loto/tickets/{ticketId}` | `/pago-loto/tickets/{ticketId}` |  |
| `GET` | `pago-loto/tickets/{ticketId}/pdf` | `/pago-loto/tickets/{ticketId}/pdf` |  |

## RCA / My Car

_38 unique method + path_

| Method | Annotated path | Resolved | Query / notes |
| --- | --- | --- | --- |
| `POST` | `rca/` | `/rca/` |  |
| `GET` | `rca/addresses` | `/rca/addresses` |  |
| `POST` | `rca/addresses` | `/rca/addresses` |  |
| `DELETE` | `rca/addresses/{uuid}` | `/rca/addresses/{uuid}` |  |
| `PUT` | `rca/calendar` | `/rca/calendar` |  |
| `PUT` | `rca/calendar-offers` | `/rca/calendar-offers` |  |
| `GET` | `rca/cars` | `/rca/cars` |  |
| `PATCH` | `rca/cars` | `/rca/cars` | query: partner |
| `POST` | `rca/cars` | `/rca/cars` |  |
| `GET` | `rca/cars/widget` | `/rca/cars/widget` | query: limit |
| `PATCH` | `rca/cars/{car_uuid}/informUser` | `/rca/cars/{car_uuid}/informUser` |  |
| `DELETE` | `rca/cars/{uuid}` | `/rca/cars/{uuid}` | query: partner |
| `GET` | `rca/cars/{uuid}/expiries` | `/rca/cars/{uuid}/expiries` |  |
| `POST` | `rca/cars/{uuid}/expiries/{expiry}` | `/rca/cars/{uuid}/expiries/{expiry}` |  |
| `GET` | `rca/discount` | `/rca/discount` | query: rcaDiscountId |
| `GET` | `rca/legalEntities` | `/rca/legalEntities` |  |
| `POST` | `rca/legalEntities` | `/rca/legalEntities` |  |
| `DELETE` | `rca/legalEntities/{legalEntityUuid}` | `/rca/legalEntities/{legalEntityUuid}` |  |
| `GET` | `rca/legalEntity/{uuid}/document` | `/rca/legalEntity/{uuid}/document` |  |
| `POST` | `rca/offers` | `/rca/offers` |  |
| `PUT` | `rca/offers` | `/rca/offers` |  |
| `GET` | `rca/offers/requests` | `/rca/offers/requests` | query: rcaRequestId |
| `POST` | `rca/options` | `/rca/options` | query: userConsent |
| `GET` | `rca/persons` | `/rca/persons` |  |
| `POST` | `rca/persons` | `/rca/persons` |  |
| `DELETE` | `rca/persons/{uuid}` | `/rca/persons/{uuid}` |  |
| `GET` | `rca/persons/{uuid}/document` | `/rca/persons/{uuid}/document` |  |
| `GET` | `rca/static` | `/rca/static` |  |
| `GET` | `rca/static/counties` | `/rca/static/counties` |  |
| `GET` | `rca/static/models` | `/rca/static/models` | query: brand |
| `GET` | `rca/users` | `/rca/users` |  |
| `POST` | `rca/users` | `/rca/users` |  |
| `POST` | `rca/utils/cars` | `/rca/utils/cars` | query: feed |
| `POST` | `rca/utils/legalEntity` | `/rca/utils/legalEntity` |  |
| `POST` | `rca/validate-cnp` | `/rca/validate-cnp` |  |
| `GET` | `rca/{uuid}/pdf` | `/rca/{uuid}/pdf` |  |
| `GET` | `sdk/rca/{uuid}/pdf` | `/sdk/rca/{uuid}/pdf` |  |
| `POST` | `identity_card` | `—` | multipart |

## Insurance / travel / PAD

_37 unique method + path_

| Method | Annotated path | Resolved | Query / notes |
| --- | --- | --- | --- |
| `GET` | `pago-bridge-toll/bridge-toll/{bridgeTollId}/pdf` | `/pago-bridge-toll/bridge-toll/{bridgeTollId}/pdf` |  |
| `GET` | `/pago-commons/countries` | `/pago-commons/countries` | query: service |
| `GET` | `/pago-insurance/car_details/{carId}` | `/pago-insurance/car_details/{carId}` |  |
| `GET` | `/pago-insurance/counties` | `/pago-insurance/counties` |  |
| `POST` | `/pago-insurance/getAddressByZip/{postalCode}` | `/pago-insurance/getAddressByZip/{postalCode}` |  |
| `GET` | `/pago-insurance/getPadOfferDetails/{housingTypeId}` | `/pago-insurance/getPadOfferDetails/{housingTypeId}` |  |
| `POST` | `/pago-insurance/getPadPolicyInfo` | `/pago-insurance/getPadPolicyInfo` |  |
| `GET` | `/pago-insurance/houses` | `/pago-insurance/houses` |  |
| `POST` | `/pago-insurance/houses` | `/pago-insurance/houses` |  |
| `DELETE` | `/pago-insurance/houses/{houseId}` | `/pago-insurance/houses/{houseId}` |  |
| `GET` | `/pago-insurance/houses/{id}` | `/pago-insurance/houses/{id}` |  |
| `POST` | `/pago-insurance/pad/get-offer-pdf` | `/pago-insurance/pad/get-offer-pdf` |  |
| `POST` | `/pago-insurance/pad/offers` | `/pago-insurance/pad/offers` |  |
| `POST` | `/pago-insurance/pad/save-offer` | `/pago-insurance/pad/save-offer` |  |
| `POST` | `/pago-insurance/travel/document` | `/pago-insurance/travel/document` |  |
| `GET` | `/pago-insurance/travel/travelScope` | `/pago-insurance/travel/travelScope` |  |
| `POST` | `/pago-travel/travel/travels` | `/pago-travel/travel/travels` |  |
| `GET` | `/pago-travel/travel/travels/{groupId}` | `/pago-travel/travel/travels/{groupId}` |  |
| `GET` | `pago-vignette/vignette/{vignetteId}/pdf` | `/pago-vignette/vignette/{vignetteId}/pdf` |  |
| `POST` | `cars` | `—` |  |
| `DELETE` | `delete-car` | `—` | query: carId |
| `DELETE` | `delete-legal-entity` | `—` | query: legalEntityId |
| `DELETE` | `delete-person` | `—` | query: personId |
| `GET` | `getLegalEntity` | `—` | query: cui |
| `GET` | `legal-entities` | `—` |  |
| `POST` | `legal-entities` | `—` |  |
| `GET` | `pad/all-data` | `—` |  |
| `GET` | `pad/policy` | `—` | query: padId |
| `GET` | `pending_rca_offers` | `—` |  |
| `GET` | `persons` | `—` |  |
| `POST` | `persons` | `—` |  |
| `GET` | `policy` | `—` | query: offerId |
| `GET` | `travel/insurancePrograms/details` | `—` |  |
| `GET` | `travel/pending` | `—` |  |
| `GET` | `travel/policy` | `—` | query: travelId |
| `GET` | `travel/travelScope` | `—` |  |
| `GET` | `validate-cnp` | `—` | query: cnp |

## Vignette & bridge toll

_8 unique method + path_

| Method | Annotated path | Resolved | Query / notes |
| --- | --- | --- | --- |
| `GET` | `bridge-toll/` | `/bridge-toll/` |  |
| `POST` | `bridge-toll/` | `/bridge-toll/` |  |
| `GET` | `bridge-toll/all-data` | `/bridge-toll/all-data` |  |
| `GET` | `bridge-toll/reset/{bridgeTollId}` | `/bridge-toll/reset/{bridgeTollId}` |  |
| `GET` | `vignette/` | `/vignette/` |  |
| `POST` | `vignette/` | `/vignette/` |  |
| `GET` | `vignette/all-data` | `/vignette/all-data` |  |
| `GET` | `vignette/reset/{vignetteId}` | `/vignette/reset/{vignetteId}` |  |

## Taxes / debt

_4 unique method + path_

| Method | Annotated path | Resolved | Query / notes |
| --- | --- | --- | --- |
| `DELETE` | `debt/debt-account/{accoundId}` | `/debt/debt-account/{accoundId}` |  |
| `GET` | `debt/fetch-account` | `/debt/fetch-account` |  |
| `POST` | `debt/parse-account-api` | `/debt/parse-account-api` |  |
| `POST` | `debt/pay-taxes-api` | `/debt/pay-taxes-api` |  |

## Freemium / subscriptions

_25 unique method + path_

| Method | Annotated path | Resolved | Query / notes |
| --- | --- | --- | --- |
| `GET` | `subscriptions` | `/subscriptions` |  |
| `DELETE` | `subscriptions/user/subscription` | `/subscriptions/user/subscription` |  |
| `GET` | `subscriptions/user/subscription` | `/subscriptions/user/subscription` | query: status |
| `POST` | `subscriptions/user/subscription` | `/subscriptions/user/subscription` |  |
| `GET` | `subscriptions/user/subscription/{userSubscriptionId}` | `/subscriptions/user/subscription/{userSubscriptionId}` |  |
| `PUT` | `subscriptions/{integratorPrefix}/status` | `/subscriptions/{integratorPrefix}/status` |  |
| `GET` | `user/campaign` | `/user/campaign` |  |
| `GET` | `user/campaign/{id}` | `/user/campaign/{id}` |  |
| `GET` | `active` | `—` |  |
| `GET` | `all/{locale}` | `—` |  |
| `GET` | `campaign_trace` | `—` |  |
| `GET` | `campaigns` | `—` |  |
| `POST` | `change_free_trial` | `—` |  |
| `POST` | `discount_campaign` | `—` |  |
| `POST` | `downgrade` | `—` |  |
| `POST` | `extend_subscription` | `—` |  |
| `GET` | `free-trial` | `—` |  |
| `GET` | `pending_subscriptions` | `—` |  |
| `PUT` | `renew` | `—` |  |
| `POST` | `subscribe` | `—` |  |
| `POST` | `subscribe-free-trial` | `—` |  |
| `GET` | `unpaid` | `—` |  |
| `POST` | `unsubscribe` | `—` |  |
| `POST` | `upgrade_subscription_with_bonus_days` | `—` |  |
| `GET` | `user_renew` | `—` |  |

## Prepay / e-pin / gaming

_11 unique method + path_

| Method | Annotated path | Resolved | Query / notes |
| --- | --- | --- | --- |
| `GET` | `pago-epingaming/offers` | `/pago-epingaming/offers` |  |
| `POST` | `pago-epingaming/validate/{offerId}` | `/pago-epingaming/validate/{offerId}` |  |
| `GET` | `pago-epingaming/vouchers` | `/pago-epingaming/vouchers` |  |
| `POST` | `pago-prepay/epin/offers` | `/pago-prepay/epin/offers` |  |
| `POST` | `pago-prepay/offers` | `/pago-prepay/offers` |  |
| `GET` | `pago-prepay/settings` | `/pago-prepay/settings` |  |
| `POST` | `pago-prepay/settings` | `/pago-prepay/settings` |  |
| `PUT` | `pago-prepay/settings` | `/pago-prepay/settings` |  |
| `DELETE` | `pago-prepay/settings/{phoneNumberId}` | `/pago-prepay/settings/{phoneNumberId}` |  |
| `POST` | `/pos_v1_1/prepay/recharge/validate/{uuid}` | `/pos_v1_1/prepay/recharge/validate/{uuid}` |  |
| `GET` | `pos_v1_1/prepay/recharges` | `/pos_v1_1/prepay/recharges` |  |

## Donations

_6 unique method + path_

| Method | Annotated path | Resolved | Query / notes |
| --- | --- | --- | --- |
| `POST` | `donation` | `/donation` |  |
| `GET` | `ngos` | `/ngos` |  |
| `GET` | `ngos/settings` | `/ngos/settings` |  |
| `POST` | `ngos/settings` | `/ngos/settings` |  |
| `DELETE` | `ngos/{ngoId}/settings` | `/ngos/{ngoId}/settings` |  |
| `GET` | `ngos/{ngoId}/settings` | `/ngos/{ngoId}/settings` |  |

## Points / referral

_8 unique method + path_

| Method | Annotated path | Resolved | Query / notes |
| --- | --- | --- | --- |
| `POST` | `/notification/referral/notify` | `/notification/referral/notify` |  |
| `GET` | `points/referral` | `/points/referral` |  |
| `GET` | `points/referral/users` | `/points/referral/users` |  |
| `GET` | `achievements` | `—` |  |
| `PUT` | `achievements/seen` | `—` |  |
| `GET` | `achievements/unseen` | `—` | query: limit |
| `GET` | `rewards` | `—` |  |
| `GET` | `spendings` | `—` |  |

## Notifications

_6 unique method + path_

| Method | Annotated path | Resolved | Query / notes |
| --- | --- | --- | --- |
| `DELETE` | `/notification_v1_1/cars/{registration_number}/alert` | `/notification_v1_1/cars/{registration_number}/alert` |  |
| `POST` | `notification_v1_1/confirm/{notification_id}` | `/notification_v1_1/confirm/{notification_id}` |  |
| `GET` | `/notification_v1_1/details/cars` | `/notification_v1_1/details/cars` |  |
| `GET` | `notification_v1_1/entities/{notification_id}` | `/notification_v1_1/entities/{notification_id}` |  |
| `PUT` | `/notification_v1_1/settings/car/{registration_number}` | `/notification_v1_1/settings/car/{registration_number}` |  |
| `POST` | `pos_v1_1/configuration/notifications/{uuid}` | `/pos_v1_1/configuration/notifications/{uuid}` |  |

## Legacy POS invoices

_19 unique method + path_

| Method | Annotated path | Resolved | Query / notes |
| --- | --- | --- | --- |
| `GET` | `account/suspect-accounts` | `/account/suspect-accounts` |  |
| `POST` | `/pago-invoice/pos_v1_1/provider/code-v3` | `/pago-invoice/pos_v1_1/provider/code-v3` |  |
| `POST` | `pos_v1_1/account/2fa` | `/pos_v1_1/account/2fa` |  |
| `PUT` | `pos_v1_1/account/2fa` | `/pos_v1_1/account/2fa` |  |
| `GET` | `pos_v1_1/account/validate-v2` | `/pos_v1_1/account/validate-v2` |  |
| `DELETE` | `pos_v1_1/account/{uri}/{id}` | `/pos_v1_1/account/{uri}/{id}` |  |
| `GET` | `pos_v1_1/configuration/providers/0` | `/pos_v1_1/configuration/providers/0` |  |
| `POST` | `pos_v1_1/invoice/due_date-v2` | `/pos_v1_1/invoice/due_date-v2` |  |
| `DELETE` | `pos_v1_1/invoice/{uuid}/{invoice}` | `/pos_v1_1/invoice/{uuid}/{invoice}` |  |
| `PATCH` | `pos_v1_1/location/e-invoice/{locationId}/{electronicInvoiceType}` | `/pos_v1_1/location/e-invoice/{locationId}/{electronicInvoiceType}` |  |
| `POST` | `pos_v1_1/location/hidden` | `/pos_v1_1/location/hidden` |  |
| `POST` | `pos_v1_1/location/icon` | `/pos_v1_1/location/icon` |  |
| `POST` | `pos_v1_1/provider/account/active` | `/pos_v1_1/provider/account/active` |  |
| `GET` | `pos_v1_1/provider/fetch/{uuid}` | `/pos_v1_1/provider/fetch/{uuid}` |  |
| `GET` | `pos_v1_1/provider/pdfbytes/{invoiceId}` | `/pos_v1_1/provider/pdfbytes/{invoiceId}` |  |
| `GET` | `pos_v1_1/settings/provider/types-v2` | `/pos_v1_1/settings/provider/types-v2` |  |
| `PUT` | `/providers/onboarded/{posUUID}` | `/providers/onboarded/{posUUID}` |  |
| `POST` | `providers/submission-credentials/{submissionId}` | `/providers/submission-credentials/{submissionId}` |  |
| `POST` | `/providers/upload` | `/providers/upload` | multipart |

## Messages / extra info / i18n / gatekeeper

_29 unique method + path_

| Method | Annotated path | Resolved | Query / notes |
| --- | --- | --- | --- |
| `GET` | `cellarium/internationalization/{categoryId}` | `/cellarium/internationalization/{categoryId}` |  |
| `POST` | `extrainfo/tc` | `/extrainfo/tc` |  |
| `GET` | `/gatekeeper/available-features/android/{versionName}` | `/gatekeeper/available-features/android/{versionName}` |  |
| `POST` | `health/events` | `/health/events` |  |
| `GET` | `pago-extrainfo` | `/pago-extrainfo` |  |
| `POST` | `pago-extrainfo` | `/pago-extrainfo` |  |
| `POST` | `pago-extrainfo/tc` | `/pago-extrainfo/tc` |  |
| `GET` | `pago-feedback/feedback/access` | `/pago-feedback/feedback/access` |  |
| `GET` | `pago-feedback/feedback/access/{pos}` | `/pago-feedback/feedback/access/{pos}` |  |
| `POST` | `pago-feedback/feedback/give` | `/pago-feedback/feedback/give` |  |
| `POST` | `pago-feedback/feedback/give/{pos}` | `/pago-feedback/feedback/give/{pos}` |  |
| `POST` | `pago-feedback/feedback/request-access` | `/pago-feedback/feedback/request-access` |  |
| `POST` | `/pago-feedback/feedback/send-feedback` | `/pago-feedback/feedback/send-feedback` |  |
| `GET` | `pos_v1_1/configuration/terms` | `/pos_v1_1/configuration/terms` |  |
| `PUT` | `pos_v1_1/configuration/terms` | `/pos_v1_1/configuration/terms` |  |
| `POST` | `pago-message/card` | `/pago-message/card` |  |
| `GET` | `pago-message/cards` | `/pago-message/cards` | query: screen |
| `POST` | `pago-message/intro-screen` | `/pago-message/intro-screen` |  |
| `GET` | `/pago-message/intro-screens` | `/pago-message/intro-screens` | query: screen |
| `POST` | `pos_v1_1/configuration/unavailable_sections` | `/pos_v1_1/configuration/unavailable_sections` |  |
| `GET` | `pos_v1_1/flows/processes` | `/pos_v1_1/flows/processes` |  |
| `DELETE` | `pos_v1_1/flows/processes/{flowId}` | `/pos_v1_1/flows/processes/{flowId}` |  |
| `PUT` | `pos_v1_1/flows/{flowId}` | `/pos_v1_1/flows/{flowId}` |  |
| `POST` | `pos_v1_1/partners/123credit/sessions` | `/pos_v1_1/partners/123credit/sessions` |  |
| `GET` | `pos_v1_1/stats` | `/pos_v1_1/stats` |  |
| `GET` | `providers/invoiceDetails` | `/providers/invoiceDetails` | query: barcode |
| `GET` | `providers/top-crawled` | `/providers/top-crawled` | query: n |
| `GET` | `providers/top-scanned/{n}` | `/providers/top-scanned/{n}` |  |
| `GET` | `providers/{uri}/` | `/providers/{uri}/` | query: barcode |

## Third-party HTTP (not pago.cloud)

Shipped SDKs. Not the Pago backend.

| SDK | Host / surface |
| --- | --- |
| Loggly | `POST https://logs-01.loggly.com/inputs/{token}` (`X-LOGGLY-TAG`) |
| Romcard | `POST https://www.secure11gw.ro/portal/cgi-bin/` (form `AMOUNT`, `CURRENCY`, `ORDER`, …) |
| Crowdin | `api.crowdin.com` / `distributions.crowdin.net` — OAuth token, project files, translations, screenshots, storages |
| Intercom | Messenger, help center, surveys, tickets (`conversations/…`, `help_center/…`, `surveys/…`, `tickets/…`) |

## Other hosts in the binary

Not Retrofit Pago API, but referenced:

- Marketing / legal: `https://www.pago.ro/…`, `https://pago.app/…`, `https://pagoplateste.ro/…`
- Deep links: `https://pagoapp.page.link`, `https://pago-invite.onelink.me/…`, `pago://redirects.pago.ro/links/lottery?ticketId=`
- Supplier portals opened in WebView: Digi, Enel, E.ON, Ghișeul.ro, Aquatim
- Analytics / consent: CleverTap, AppsFlyer, Microsoft Clarity, Usercentrics, Firebase, Huawei GRS
- CarVertical affiliate URLs

## Counts

- Retrofit methods in all DEX files: 471
- Pago app Retrofit methods (unique method+path): 352
- Third-party Retrofit methods: 72
