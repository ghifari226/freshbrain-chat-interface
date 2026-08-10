function JwtHandshakeSide({ label, colorClass, secret, payload, action, exampleJson }) {
  const payloadSection = payload ? `\npayload = ${payload}\n` : ''
  return (
    <div className="jwt-handshake__side">
      <div className={`jwt-handshake__label ${colorClass}`}>{label}</div>
      <pre className="jwt-handshake__body">{`.env:
JWT_SECRET=${secret}
JWT_ALGO=HS256
`}<span className="jwt-handshake__note">(matching env)</span>{`
${payloadSection}
action:
${action}`}</pre>
      {exampleJson && (
        <pre className="jwt-handshake__body">{JSON.stringify(exampleJson, null, 2)}</pre>
      )}
    </div>
  )
}

// dev-doc branch only — shows Freddy the JWT signing/verification handshake
// between chat-gateway and ai-engine: same shared secret + algorithm on both
// sides, gateway encodes on login/refresh, ai-engine decodes on every
// request. Freeze/remove once the contract is settled; it isn't meant to
// ship to Production.
export default function JwtHandshakePreview({ title, secret, payload, gatewayAction, aiEngineAction, exampleTokenResponse }) {
  return (
    <div className="gateway-json-preview">
      <div className="jwt-handshake__title">{title}</div>
      <JwtHandshakeSide
        label="Gateway Backend Token Encoding"
        colorClass="jwt-handshake__label--red"
        secret={secret}
        payload={payload}
        action={gatewayAction}
        exampleJson={exampleTokenResponse}
      />
      <div className="jwt-handshake__arrow">↓</div>
      <JwtHandshakeSide
        label="AI Engine Token Decoding"
        colorClass="jwt-handshake__label--green"
        secret={secret}
        action={aiEngineAction}
      />
    </div>
  )
}
