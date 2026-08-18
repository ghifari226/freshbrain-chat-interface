export default function SectionToggle({ options, isActive, onSelect, labelForOption, ariaLabel }) {
  if (options.length <= 1) return null

  return (
    <div className="theme-toggle theme-toggle--section" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={'theme-toggle__option' + (isActive(option) ? ' theme-toggle__option--active' : '')}
          onClick={() => onSelect(option)}
        >
          {labelForOption(option)}
        </button>
      ))}
    </div>
  )
}
