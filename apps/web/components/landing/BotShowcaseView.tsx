"use client";

import type { ReactNode } from "react";
import type { BotShowcaseData } from "../../lib/bot-showcase";
import { useAppLocale } from "../providers/AppLocaleProvider";

type Props = { data: BotShowcaseData };

function PhoneFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="bot-phone-wrap">
      <span className="bot-phone-wrap__label">{label}</span>
      <div className="bot-phone">
        <div className="bot-phone__bezel">
          <div className="bot-phone__screen">{children}</div>
        </div>
      </div>
    </div>
  );
}

function WhatsAppChrome({ children, onlineLabel, messageLabel }: { children: ReactNode; onlineLabel: string; messageLabel: string }) {
  return (
    <div className="wa-ui">
      <div className="wa-statusbar">
        <span className="wa-statusbar__time">9:41</span>
        <span className="wa-statusbar__icons">
          <span className="wa-statusbar__signal" aria-hidden />
          <span className="wa-statusbar__wifi" aria-hidden />
          <span className="wa-statusbar__battery" aria-hidden />
        </span>
      </div>
      <header className="wa-topbar">
        <span className="wa-topbar__back" aria-hidden>
          ‹
        </span>
        <div className="wa-topbar__avatar" aria-hidden>
          M
        </div>
        <div className="wa-topbar__info">
          <strong>Monana</strong>
          <span>{onlineLabel}</span>
        </div>
        <div className="wa-topbar__actions" aria-hidden>
          <span>📹</span>
          <span>📞</span>
          <span className="wa-topbar__menu">⋮</span>
        </div>
      </header>
      <div className="wa-chat">{children}</div>
      <footer className="wa-inputbar">
        <span className="wa-inputbar__emoji" aria-hidden>
          ☺
        </span>
        <span className="wa-inputbar__field">{messageLabel}</span>
        <span className="wa-inputbar__attach" aria-hidden>
          📎
        </span>
        <span className="wa-inputbar__mic" aria-hidden>
          🎤
        </span>
      </footer>
    </div>
  );
}

function WaIncoming({ time, children }: { time: string; children: ReactNode }) {
  return (
    <div className="wa-msg wa-msg--in">
      <div className="wa-bubble wa-bubble--in">{children}</div>
      <span className="wa-meta">{time}</span>
    </div>
  );
}

function WaOutgoing({ time, children }: { time: string; children: ReactNode }) {
  return (
    <div className="wa-msg wa-msg--out">
      <div className="wa-bubble wa-bubble--out">{children}</div>
      <span className="wa-meta">
        {time} <span className="wa-ticks">✓✓</span>
      </span>
    </div>
  );
}

function MenuScreen({ data }: Props) {
  const { t } = useAppLocale();

  return (
    <WhatsAppChrome onlineLabel={t("waOnline")} messageLabel={t("waMessage")}>
      <div className="wa-date">{t("waToday")}</div>

      <WaIncoming time="9:38 AM">
        <p className="wa-text wa-text--bold">{t("waWelcome")}</p>
        <p className="wa-text wa-text--muted">{t("waReplyStart")}</p>
      </WaIncoming>

      <WaIncoming time="9:38 AM">
        {data.menu.groups.map((g) => (
          <div key={g.title} className="wa-menu-block">
            <p className="wa-menu-block__title">{g.title}</p>
            {g.items.map((item) => (
              <p key={item.key} className="wa-menu-line">
                <span className="wa-menu-line__num">{item.key}</span>
                {item.label}
              </p>
            ))}
          </div>
        ))}
      </WaIncoming>

      <WaOutgoing time="9:39 AM">
        <span className="wa-reply-num">2</span>
      </WaOutgoing>

      <WaIncoming time="9:39 AM">
        <p className="wa-text">{t("waGroceryShop")}</p>
        <p className="wa-text wa-text--small">{t("waDemoRice")}</p>
        <p className="wa-text wa-text--small">{t("waDemoOil")}</p>
        <p className="wa-text wa-text--muted wa-text--small">{t("waReplyDone")}</p>
      </WaIncoming>
    </WhatsAppChrome>
  );
}

function PaymentScreen({ data }: Props) {
  const { t } = useAppLocale();

  return (
    <WhatsAppChrome onlineLabel={t("waOnline")} messageLabel={t("waMessage")}>
      <div className="wa-date">{t("waToday")}</div>

      <WaOutgoing time="10:02 AM">
        <span className="wa-text">{t("waDone")}</span>
      </WaOutgoing>

      <WaIncoming time="10:02 AM">
        <p className="wa-text wa-text--bold">
          🧾 {t("orderLabel")} #{data.payment.sampleOrderId}
        </p>
        <p className="wa-text">
          {t("waOrderLine")}
          <br />
          <strong>{data.payment.sampleTotal}</strong>
        </p>
        <p className="wa-text wa-text--small wa-text--muted">{t("waSampleAddress")}</p>
      </WaIncoming>

      <WaIncoming time="10:02 AM">
        <p className="wa-text wa-text--bold">💳 Lipa Namba</p>
        <p className="wa-lipa">{data.payment.lipaNamba}</p>
        <p className="wa-text wa-text--small">{data.payment.lipaNambaName}</p>
        <p className="wa-text wa-text--small wa-text--muted">{data.payment.steps}</p>
        <p className="wa-text wa-text--muted wa-text--small">{t("waAfterPay")}</p>
      </WaIncoming>

      <WaOutgoing time="10:05 AM">
        <span className="wa-text">{t("waPaidSample")}</span>
      </WaOutgoing>

      <WaIncoming time="10:05 AM">
        <p className="wa-text">{t("waPayThanks")}</p>
      </WaIncoming>
    </WhatsAppChrome>
  );
}

const FEATURE_KEYS = [
  { icon: "💬", title: "botFeatMenuTitle" as const, text: "botFeatMenuText" as const },
  { icon: "🛒", title: "botFeatOrderTitle" as const, text: "botFeatOrderText" as const },
  { icon: "📦", title: "botFeatMemberTitle" as const, text: "botFeatMemberText" as const },
];

export function BotShowcaseView({ data }: Props) {
  const { t } = useAppLocale();

  return (
    <section className="landing-section landing-bot-showcase" id="whatsapp-bot">
      <div className="landing-bot-showcase__header">
        <span className="landing-bot-showcase__eyebrow">{t("botEyebrow")}</span>
        <h2 className="landing-section__title">{t("botTitle")}</h2>
        {data.phoneDisplay ? (
          <p className="landing-bot-showcase__number">
            <a
              href={data.whatsappUrl ?? "#"}
              className="landing-bot-showcase__phone"
              target="_blank"
              rel="noopener noreferrer"
            >
              {data.phoneDisplay}
            </a>
          </p>
        ) : null}
        <p className="landing-section__subtitle landing-bot-showcase__subtitle">{t("botSub")}</p>
        {data.whatsappUrl ? (
          <a
            href={data.whatsappUrl}
            className="landing-btn landing-btn--orange landing-bot-showcase__cta"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("botChatCta")}
          </a>
        ) : (
          <a href="/support" className="landing-btn landing-btn--ghost landing-bot-showcase__cta">
            {t("botContactSupport")}
          </a>
        )}
      </div>

      <div className="landing-bot-showcase__phones">
        <PhoneFrame label={t("botPhoneMenu")}>
          <MenuScreen data={data} />
        </PhoneFrame>
        <PhoneFrame label={t("botPhonePay")}>
          <PaymentScreen data={data} />
        </PhoneFrame>
      </div>

      <div className="landing-bot-showcase__features">
        {FEATURE_KEYS.map((f) => (
          <div key={f.title} className="landing-bot-showcase__feature">
            <span className="landing-bot-showcase__feature-icon">{f.icon}</span>
            <h4>{t(f.title)}</h4>
            <p>{t(f.text)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
