import { Fragment } from 'react'

// Renders JSON.stringify(data, null, 2)'s exact formatting (2-space indent,
// same bracket/comma placement) but as JSX instead of a plain string, so
// values belonging to gatewayFields can get a red span around just their
// content — quotes stay the default body color. gatewayFields applies to a
// key at any depth, and an array under a gateway key colors every element
// plus its own [ ] brackets (e.g. allowed_scopes: ['*'] highlights both the
// brackets and '*').
function renderJsonValue(value, gatewayFields, isGatewayValue, indent) {
  const pad = '  '.repeat(indent)
  const childPad = '  '.repeat(indent + 1)

  if (value === null || value === undefined) return 'null'

  if (Array.isArray(value)) {
    const openBracket = isGatewayValue ? (
      <span className="gateway-json-preview__gateway-value">[</span>
    ) : (
      '['
    )
    const closeBracket = isGatewayValue ? (
      <span className="gateway-json-preview__gateway-value">]</span>
    ) : (
      ']'
    )
    if (value.length === 0) {
      return (
        <Fragment>
          {openBracket}
          {closeBracket}
        </Fragment>
      )
    }
    return (
      <Fragment>
        {openBracket}
        {'\n'}
        {value.map((item, index) => (
          <Fragment key={index}>
            {childPad}
            {renderJsonValue(item, gatewayFields, isGatewayValue, indent + 1)}
            {index < value.length - 1 ? ',' : ''}
            {'\n'}
          </Fragment>
        ))}
        {pad}
        {closeBracket}
      </Fragment>
    )
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) return '{}'
    return (
      <Fragment>
        {'{\n'}
        {keys.map((key, index) => (
          <Fragment key={key}>
            {childPad}
            {`"${key}": `}
            {renderJsonValue(value[key], gatewayFields, gatewayFields.includes(key), indent + 1)}
            {index < keys.length - 1 ? ',' : ''}
            {'\n'}
          </Fragment>
        ))}
        {pad}
        {'}'}
      </Fragment>
    )
  }

  if (typeof value === 'string') {
    if (isGatewayValue) {
      return (
        <Fragment>
          {'"'}
          <span className="gateway-json-preview__gateway-value">{value}</span>
          {'"'}
        </Fragment>
      )
    }
    return JSON.stringify(value)
  }

  return String(value)
}

// dev-doc branch only — shows Freddy (chat-gateway backend) the exact JSON
// shape the frontend sends/expects at a gateway touch point, next to the
// live form. Freeze/remove this component (and its call sites) once the
// contract is settled; it isn't meant to ship to Production.
//
// gatewayFields (optional) — key names whose values were extracted from the
// gateway's JWT rather than produced by ai-engine itself (e.g. user_id,
// role, allowed_scopes on a /chat request); their value text renders red,
// quotes stay the default color. token (optional) — renders an
// "Authorization: Bearer <token>" line between the title and the body, with
// the token also in red for the same reason. Either one flags the panel
// itself with "AI Engine (Gateway auth)" — parens stay black, "Gateway
// auth" red — so the gateway-sourced content is visible before reading the
// body at all.
export default function GatewayJsonPreview({ title, data, variant, gatewayFields = [], token }) {
  const isAi = variant === 'ai'
  const hasGatewayContent = gatewayFields.length > 0 || Boolean(token)
  return (
    <div className={`gateway-json-preview${isAi ? ' gateway-json-preview--ai' : ''}`}>
      {isAi && (
        <div className="gateway-json-preview__title">
          AI Engine
          {hasGatewayContent && (
            <Fragment>
              {' '}
              <span className="gateway-json-preview__paren">(</span>
              <span className="gateway-json-preview__gateway-value">Gateway auth</span>
              <span className="gateway-json-preview__paren">)</span>
            </Fragment>
          )}
        </div>
      )}
      <div className="gateway-json-preview__title">{title}</div>
      {token && (
        <div className="gateway-json-preview__auth">
          Authorization: Bearer <span className="gateway-json-preview__gateway-value">{token}</span>
        </div>
      )}
      <pre className="gateway-json-preview__body">
        {gatewayFields.length > 0 ? renderJsonValue(data, gatewayFields, false, 0) : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
