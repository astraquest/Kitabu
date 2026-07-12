# Kitabu AI transactional email delivery

## Application configuration

Use a dedicated authenticated sender for account and security messages:

```env
KITABU_TRANSACTIONAL_MAIL_FROM=Kitabu AI Accounts <accounts@notify.kitabu.ai>
KITABU_TRANSACTIONAL_REPLY_TO=hello@kitabu.ai
```

Keep marketing mail on a different sender and, where supported, a separate provider stream or IP.

## Domain requirements

Configure the SMTP provider and DNS so that SPF and DKIM authenticate `notify.kitabu.ai` and align with the visible From domain. Publish DMARC for the organizational domain and monitor it before increasing enforcement. Register the sending domain in Google Postmaster Tools.

Authentication messages must not include `List-Unsubscribe` headers or marketing content. Verification and password-reset messages are transactional and are sent only after a user action.

## Gmail sender avatar (BIMI)

The inbox avatar is not controlled by the email HTML. Host the BIMI-compatible mark at:

`https://kitabu.ai/assets/kitabu-bimi.svg`

After SPF, DKIM, and DMARC alignment are passing, publish this DNS TXT record:

```dns
default._bimi.kitabu.ai TXT "v=BIMI1; l=https://kitabu.ai/assets/kitabu-bimi.svg; a="
```

Some mailbox providers require DMARC enforcement and a Verified Mark Certificate or Common Mark Certificate before displaying the logo. If a certificate is obtained, add its HTTPS URL to the `a=` value.

If mail continues to be sent from a consumer Gmail account instead of the branded domain, set the orange Kitabu “K” as that Google account's profile photo. BIMI applies to authenticated branded-domain mail.

## Verification

For every production mail change, inspect Gmail's **Show original** view and confirm:

- SPF: PASS
- DKIM: PASS
- DMARC: PASS and aligned with the From domain
- No `List-Unsubscribe` header on authentication messages
- The visible From address is the dedicated transactional sender
