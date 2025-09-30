import React, { useState, useEffect } from "react";

interface Option {
  label: string;
  value: string;
}

interface SingleDropdownProps {
  selected: string;
  setSelected: (value: string) => void;
  options: Option[]; // <-- options now passed in as a prop
}

const SingleSelectDropdown: React.FC<SingleDropdownProps> = ({ selected, setSelected, options }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOptionSelect = (value: string) => {
    if (selected === value) {
      setSelected("");
    } else {
      setSelected(value);
    }
    setIsOpen(false);
  };

  

  return (
    <div className="multi-select-container">
      <div className="dropdown-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="dropdown-label">
          {selected === "" ? "" : options.find((option) => option.value === selected)?.label}
        </span>
        <span className="arrow">{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && (
        <div className="dropdown-list">
          {options.map((option) => (
            <label key={option.value} className="dropdown-item">
              <input
                type="checkbox"
                checked={selected === option.value}
                onChange={() => handleOptionSelect(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default SingleSelectDropdown;
