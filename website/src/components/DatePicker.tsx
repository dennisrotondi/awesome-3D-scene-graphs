import React from 'react';
import { DayPicker, type DateRange, type DropdownProps } from 'react-day-picker';

type DatePickerProps = {
  onChange?: (range: DateRange | string | undefined) => void;
};

type DatePickerState = {
  selectedRange: DateRange | undefined;
  inputValue: string;
  showToast: boolean;
};
import { format } from 'date-fns';
import { Toast, Button } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';
import 'react-day-picker/dist/style.css';
import './DatePicker.css';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// eslint-disable-next-line react-refresh/only-export-components
function CustomSelectDropdown(props: DropdownProps) {
  const { options, value, onChange } = props;

  const handleValueChange = (newValue: string) => {
    if (onChange) {
      const syntheticEvent = {
        target: { value: newValue },
      } as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
  };

  return (
    <Select value={value?.toString()} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[120px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="selector">
        <SelectGroup className="selector">
          {options?.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value.toString()}
              disabled={option.disabled}
              className="selectorItem"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export class DatePicker extends React.Component<DatePickerProps, DatePickerState> {
  toastRef: React.RefObject<HTMLDivElement>;
  toastFocusRef = React.createRef<HTMLDivElement>();
  inputRef: React.RefObject<HTMLInputElement>;

  constructor(props: DatePickerProps) {
    super(props);
    this.state = {
      selectedRange: undefined,
      inputValue: '',
      showToast: false,
    };
    this.toastRef = React.createRef();
    this.inputRef = React.createRef();

    this.handleRangeSelect = this.handleRangeSelect.bind(this);
    this.handleClear = this.handleClear.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  openToast = () => {
    this.setState({ showToast: true }, () => {
      // move focus into the toast so it can receive key events
      this.toastFocusRef.current?.focus();
    });
  };

  closeToast = (propagateChange = false) => {
    this.setState({ showToast: false }, () => {
      // return focus to input for nice UX
      if (propagateChange) this.props.onChange?.(this.state.selectedRange);
    });
  };

  handleToastKeyDownCapture = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.closeToast(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      this.closeToast(true);
    }
  };

  handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      this.setState({ showToast: false });
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.setState({ showToast: true });
      //   , () => {
      //   this.props.onChange?.(this.state.selectedRange);
      // });
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const target = event.currentTarget;

      // 1) if Autosuggest menu is open for THIS input, let it handle arrows
      const autosuggestRoot = target.closest('.react-autosuggest__container');
      const autoMenuOpen = !!autosuggestRoot?.querySelector(
        '.react-autosuggest__suggestions-container--open'
      );
      if (autoMenuOpen) return;

      // 2) if DatePicker toast is open for THIS input, we close it
      const dateRoot = target.closest('.date-picker');
      const dateToastOpen = !!dateRoot?.querySelector('.toast.show, .toastItem.show');
      if (dateToastOpen) {
        this.closeToast(false);
      }

      // 3) otherwise, move focus across bars inside your container
      const container = document.getElementById('SearchBars') || document;

      // We target all navigable inputs. Your DatePicker input already has
      // "react-autosuggest__input", so it will be included. If not, add ".date-input".
      const inputs = Array.from(
        container.querySelectorAll<HTMLInputElement>('.react-autosuggest__input, .date-input')
      ).filter((el) => !el.disabled && el.offsetParent !== null); // skip disabled/hidden

      const idx = inputs.indexOf(target);
      if (idx === -1 || inputs.length === 0) return;

      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const nextIdx = (idx + delta + inputs.length) % inputs.length;

      event.preventDefault(); // stop caret move
      inputs[nextIdx].focus(); // focusing DatePicker input will open toast via onFocus
      inputs[nextIdx].select?.(); // optional: select text
    }
  };

  handleClickOutside(event: MouseEvent) {
    const target = event.target as Node;

    const clickedInsideToast = this.toastRef.current?.contains(target);
    const clickedInsideInput = this.inputRef.current?.contains(target);
    const clickedInsideDropdown = (target as HTMLElement).closest('.selector');

    if (!clickedInsideToast && !clickedInsideInput && !clickedInsideDropdown) {
      this.setState({ showToast: false });
    }
  }

  handleRangeSelect(range?: DateRange) {
    const fromStr = range?.from ? format(range.from, 'y-MM-dd') : '';
    const toStr = range?.to ? format(range.to, 'y-MM-dd') : '';

    this.setState({
      selectedRange: range,
      inputValue: fromStr && toStr ? `From ${fromStr} to ${toStr}` : fromStr || '',
    });

    // if (this.props.onChange) {
    //   this.props.onChange(range);
    // }
  }

  handleClear() {
    this.setState({
      selectedRange: { from: undefined, to: undefined },
      inputValue: '',
    });
    if (this.props.onChange) {
      this.props.onChange('');
    }
  }

  getValue() {
    return this.state.selectedRange;
  }

  render() {
    const { selectedRange, inputValue, showToast } = this.state;

    return (
      <div className="flex-grow-1 position-relative">
        {/* Input with FaTimes */}
        <div className="position-relative">
          <input
            ref={this.inputRef}
            type="text"
            className="react-autosuggest__input input-picker"
            placeholder="Filter by date range."
            value={inputValue}
            readOnly
            onKeyDown={(e) => this.handleKeyDown(e)}
            // onFocus={() => this.setState({ showToast: true })}
            onClick={() => this.setState({ showToast: true })}
          />
          <FaTimes onClick={this.handleClear} className="x-icon" />
        </div>

        {/* Toast with calendar */}
        <Toast
          ref={this.toastRef}
          show={showToast}
          onClose={() => this.setState({ showToast: false })}
          className="toastItem"
        >
          <Toast.Header closeButton>
            <strong className="me-auto">Select Dates</strong>
          </Toast.Header>
          <Toast.Body as="div" onKeyDownCapture={this.handleToastKeyDownCapture}>
            <div tabIndex={-1} ref={this.toastFocusRef}>
              <DayPicker
                mode="range"
                selected={selectedRange}
                onSelect={this.handleRangeSelect}
                captionLayout="dropdown"
                components={{ Dropdown: CustomSelectDropdown }}
              />
              <div className="mt-2 d-flex justify-content-end">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    this.setState({ showToast: false });
                    this.props.onChange?.(this.state.selectedRange);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          </Toast.Body>
        </Toast>
      </div>
    );
  }
}
