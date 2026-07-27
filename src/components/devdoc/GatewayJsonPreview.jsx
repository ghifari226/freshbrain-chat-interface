// dev-doc branch only — shows Freddy (chat-gateway backend) the exact JSON
// shape the frontend sends/expects at a gateway touch point, next to the
// live form. Freeze/remove this component (and its call sites) once the
// contract is settled; it isn't meant to ship to Production.
export default function GatewayJsonPreview({ title, data }) {
  return (
    <div className="gateway-json-preview">
      <div className="gateway-json-preview__title">{title}</div>
      <pre className="gateway-json-preview__body">{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
