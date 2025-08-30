
import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  leftLabel: string;
  rightLabel: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, leftLabel, rightLabel }) => {
  const handleToggle = () => {
    onChange(!checked);
  };

  return (
    <div className="flex items-center space-x-3">
      <span className={`font-medium text-sm transition-colors ${checked ? 'text-[#f0b90b]' : 'text-gray-400'}`}>{leftLabel}</span>
      <button
        type="button"
        className={`${
          checked ? 'bg-[#f0b90b]' : 'bg-gray-700'
        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#f0b90b] focus:ring-offset-2 focus:ring-offset-[#0c0e12]`}
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
      >
        <span
          aria-hidden="true"
          className={`${
            checked ? 'translate-x-5' : 'translate-x-0'
          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
      </button>
      <span className={`font-medium text-sm transition-colors ${!checked ? 'text-gray-200' : 'text-gray-500'}`}>{rightLabel}</span>
    </div>
  );
};

export default ToggleSwitch;