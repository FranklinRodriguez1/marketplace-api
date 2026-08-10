/**
 * The result every authorization policy returns: a machine-readable `reason`
 * on denial, never a bare boolean. The API maps `reason` straight into the
 * `reason` field of the RFC 9457 problem+json body, and the mobile app turns it
 * into a localized message with `t(`...blocked.${reason}`)`. One rule, two uses.
 */
export type Eligibility<Reason extends string> = { ok: true } | { ok: false; reason: Reason };
