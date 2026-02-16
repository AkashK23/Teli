import React, { useState, useEffect, useMemo } from "react";

/* Types */
interface MultiSelectProps {
  label: string;
  options: (string | { label: string; years: string[] })[];
  selected: string[];
  setSelected: (values: string[]) => void;
}

const MultiSelectDropdown: React.FC<MultiSelectProps> = ({
  label,
  options,
  selected,
  setSelected,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (value: string) => {
    setSelected(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  /** 🔹 Sort selected options to the top */
  const sortedOptions = useMemo(() => {
    const selectedOptions: typeof options = [];
    const unselectedOptions: typeof options = [];

    options.forEach((option) => {
      if (typeof option === "string" && selected.includes(option)) {
        selectedOptions.push(option);
      } else {
        unselectedOptions.push(option);
      }
    });

    return [...selectedOptions, ...unselectedOptions];
  }, [options, selected]);

  const displayText = selected.length > 0 
    ? `${selected.length} selected` 
    : `Select ${label}`;

  return (
    <div className="multi-select-container">
      <div className="dropdown-header" onClick={toggleDropdown}>
        <span className="dropdown-label">{displayText}</span>
        <span className="arrow">{isOpen ? "▲" : "▼"}</span>
      </div>
      
      {isOpen && (
        <div className="dropdown-list">
          {sortedOptions.map((option) => {
            if (typeof option === "string") {
              return (
                <label key={option} className="dropdown-item">
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggleOption(option)}
                  />
                  {option}
                </label>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
