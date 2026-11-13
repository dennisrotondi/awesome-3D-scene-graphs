import React from 'react';
import Autosuggest from 'react-autosuggest';
import match from 'autosuggest-highlight/match';
import parse from 'autosuggest-highlight/parse';
import { FaSearch, FaTimes } from 'react-icons/fa';
import './SearchBar.css';
import { papers } from '../components/papers';
import type { Paper } from '../components/papers';

type SearchBarProps = {
  field?: string;
  placeholder?: string;
  initialValue?: string;
  id?: number;
  icon?: 'SEARCH' | 'X';
  onSuggestionSelected?: (
    event: React.FormEvent,
    data: { suggestion: Paper; suggestionValue: string }
  ) => void;
  onClick?: (event: React.SyntheticEvent, value: string, suggestions: Paper[]) => void;
};

type SearchBarState = {
  value: string;
  suggestions: Paper[];
  field: string;
};

class SearchBar extends React.Component<SearchBarProps, SearchBarState> {
  constructor(props) {
    super(props);
    this.state = {
      value: props.initialValue || '',
      suggestions: papers,
      field: props.field || 'TITLE',
    };
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.initialValue !== this.props.initialValue ||
      prevProps.field !== this.props.field
    ) {
      this.setState({
        value: this.props.initialValue ?? '',
        field: this.props.field ?? 'TITLE',
      });
    }
  }

  getValue = () => this.state.value;

  getMatches = () => this.state.suggestions;

  onSuggestionsFetchRequested = ({ value }) => {
    const suggestions = this.getSuggestions(value);
    this.setState({ suggestions });
  };

  onSuggestionsClearRequested = () => {
    // this function doesn't work, it is required but bugged (not documented)
    // this.setState({ suggestions: papers });
  };

  shouldRenderSuggestions = (value) => {
    return value.trim().length > 0 || this.state['field'] === 'KEYWORD';
  };

  onChange = (event, { newValue }) => {
    this.setState({ value: newValue });
  };

  onKeyDown = (event) => {
    // TAB: accept first suggestion only when menu is open (your existing logic)
    if (event.key === 'Tab' && !event.shiftKey) {
      const root = event.currentTarget.closest('.react-autosuggest__container');
      const isOpen = !!root?.querySelector('.react-autosuggest__suggestions-container--open');

      if (isOpen) {
        const [first] = this.state.suggestions || [];
        if (first && this.getSuggestionValue(first) !== this.state.value) {
          event.preventDefault();
          this.setState({
            value: this.getSuggestionValue(first),
            suggestions: [first],
          });
        }
        return;
      }
    }

    // ENTER: trigger search
    if (event.key === 'Enter') {
      event.preventDefault();
      this.props.onClick?.(event, this.state.value, this.state.suggestions);
      return;
    }

    // ARROW UP/DOWN: move focus across bars when the menu is NOT open
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const target = event.currentTarget;

      // 1) if Autosuggest menu is open for THIS input, let it handle arrows
      const autosuggestRoot = target.closest('.react-autosuggest__container');
      const autoMenuOpen = !!autosuggestRoot?.querySelector(
        '.react-autosuggest__suggestions-container--open'
      );
      if (autoMenuOpen) return;

      // 2) if DatePicker toast is open for THIS input, let calendar handle arrows
      //    Add class "date-picker" on DatePicker wrapper (see note below)
      const dateRoot = target.closest('.date-picker');
      const dateToastOpen = !!dateRoot?.querySelector('.toast.show, .toastItem.show');
      if (dateToastOpen) return;

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

  handleBlur = (event) => {
    // Trigger the same behavior as pressing Enter / clicking the search icon
    this.props.onClick?.(event, this.state.value, this.state.suggestions);
  };

  // Suggestions for the AUTHOR / VENUE / KEYWORD bars are the distinct values
  // of that field (one entry per author, not per paper), so each stand-in
  // carries only `field`. They are typed as Paper to keep one suggestion type:
  // only `field` and `suggestionValue` are ever read from them, and the one
  // caller that uses the suggestion list as papers (Home) uses a TITLE bar,
  // which always suggests full papers.
  extractSingle(suggestions: Paper[], field: string): Paper[] {
    let values: string[] = [];
    for (const paper of suggestions) {
      values = values.concat(
        String(paper[field] || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
    }
    return Array.from(new Set(values)).map((value) => ({ [field]: value }) as unknown as Paper);
  }

  getSuggestions = (value) => {
    // we check if the first character of value is ! or & to switch search mode
    const field = this.state.field;
    const resource =
      field === 'TITLE' || field === 'DATE' ? papers : this.extractSingle(papers, field);
    const query = String(value).toLowerCase();
    return resource.filter(
      (paper) =>
        String(paper[field] || '')
          .toLowerCase()
          .includes(query) && Boolean(paper[field])
    );
  };

  getSuggestionValue = (suggestion) => {
    // If we created {display: "..."} above, prefer that; otherwise fall back to the current field
    if (typeof suggestion?.display === 'string') return suggestion.display;
    const { field } = this.state;
    return String(suggestion?.[field] || '');
  };

  renderSuggestion = (suggestion, { query }) => {
    const text = this.getSuggestionValue(suggestion);
    const matches = match(text, query, { insideWords: true });
    const parts = parse(text, matches);

    return (
      <span>
        {parts.map((part, i) => (
          <span
            key={i}
            className={part.highlight ? 'react-autosuggest__suggestion-match' : undefined}
          >
            {part.text}
          </span>
        ))}
      </span>
    );
  };

  // Custom input with icon
  renderInputComponent = (inputProps) => {
    const icon = (this.props.icon || 'SEARCH').toUpperCase();
    const { key: _key, ...rest } = inputProps;
    if (icon === 'SEARCH') {
      return (
        <div className="inputContainer">
          <FaSearch
            className="position-absolute search-icon"
            tabIndex={0}
            onClick={(event) => {
              this.props.onClick?.(event, this.state.value, this.state.suggestions);
            }}
          />
          <input {...rest} />
        </div>
      );
    } else if (icon === 'X') {
      return (
        <div className="inputContainer">
          <FaTimes
            className="position-absolute search-icon"
            tabIndex={0}
            onClick={(event) => {
              event.preventDefault();
              this.setState({ value: '', suggestions: papers });
              this.props.onClick?.(event, '', papers);
            }}
          />
          <input {...rest} />
        </div>
      );
    }
  };

  render() {
    const { value } = this.state;

    const inputProps = {
      placeholder:
        this.props.placeholder || `Search by ${(this.state.field || 'TITLE').toLowerCase()}.`,
      value,
      onChange: this.onChange,
      onKeyDown: this.onKeyDown,
      onBlur: this.handleBlur,
    };

    return (
      <Autosuggest
        suggestions={this.state.suggestions}
        inputProps={inputProps}
        onSuggestionSelected={this.props.onSuggestionSelected}
        onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
        onSuggestionsClearRequested={this.onSuggestionsClearRequested}
        getSuggestionValue={this.getSuggestionValue}
        shouldRenderSuggestions={this.shouldRenderSuggestions}
        renderSuggestion={this.renderSuggestion}
        renderInputComponent={this.renderInputComponent}
      />
    );
  }
}

export default SearchBar;
