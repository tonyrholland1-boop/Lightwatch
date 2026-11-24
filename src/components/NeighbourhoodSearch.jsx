import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { statusMeta, timeAgo } from '../lib/format.js';

function score(area, term) {
  const name = area.name.toLowerCase();
  const city = area.city.toLowerCase();
  const state = area.state.toLowerCase();
  if (name === term) return 0;
  if (name.startsWith(term)) return 1;
  if (name.split(/[\s-]+/).some((word) => word.startsWith(term))) return 2;
  if (name.includes(term)) return 3;
  if (city.includes(term)) return 4;
  if (state.includes(term)) return 5;
  return 99;
}

export default function NeighbourhoodSearch({
  areas = [],
  onSelect,
  variant = 'panel',
  autoFocus = false,
  placeholder = 'Search a neighbourhood — e.g. Lekki, Yaba, Wuse',
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();
  const inputId = useId();

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const base = term
      ? areas
          .map((area) => ({ area, rank: score(area, term) }))
          .filter((entry) => entry.rank < 99)
          .sort((a, b) => a.rank - b.rank || a.area.name.localeCompare(b.area.name))
          .map((entry) => entry.area)
      : areas;
    return base.slice(0, 7);
  }, [areas, query]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  const choose = (area) => {
    onSelect(area);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % Math.max(results.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === 'Enter') {
      if (open && results.length) {
        event.preventDefault();
        const target = results[activeIndex >= 0 ? activeIndex : 0];
        if (target) choose(target);
      } else if (results.length === 1) {
        choose(results[0]);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const showPanel = open;

  return (
    <div
      className={`search ${variant === 'hero' ? 'search--hero' : ''}`}
      ref={rootRef}
      role="search"
    >
      <label htmlFor={inputId} className="sr-only">
        Search supported neighbourhoods
      </label>
      <div className="search__shell">
        <Icon name="search" size={17} className="search__icon" />
        <input
          id={inputId}
          ref={inputRef}
          className="search__input"
          type="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          placeholder={placeholder}
          value={query}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 && results[activeIndex] ? `${listId}-opt-${results[activeIndex].slug}` : undefined
          }
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            type="button"
            className="search__clear"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <Icon name="close" size={14} />
          </button>
        )}
        <button
          type="button"
          className="btn btn--light search__submit"
          onClick={() => {
            const target = results[activeIndex >= 0 ? activeIndex : 0];
            if (target) choose(target);
            else inputRef.current?.focus();
          }}
        >
          Check
        </button>
      </div>

      <div
        id={listId}
        className="search__results"
        role="listbox"
        aria-label="Matching neighbourhoods"
        hidden={!showPanel}
      >
        {results.length === 0 ? (
          <div className="search__empty">
            <p className="search__empty-title">No supported neighbourhood matches &ldquo;{query}&rdquo;</p>
            <p className="search__empty-copy">
              LightWatch only covers areas in the pilot. Search another name, or{' '}
              <a href="#trust">suggest an area</a> for coverage.
            </p>
          </div>
        ) : (
          <>
            <p className="search__group-label">
              {query.trim() ? 'Matching supported areas' : 'Supported areas'}
            </p>
            <ul className="search__list">
              {results.map((area, index) => {
                const meta = statusMeta(area.status);
                return (
                  <li key={area.id}>
                    <button
                      type="button"
                      id={`${listId}-opt-${area.slug}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      data-active={index === activeIndex}
                      className="search__option"
                      onClick={() => choose(area)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span>
                        <span className="search__option-name">{area.name}</span>
                        <span className="search__option-meta">
                          {area.city}, {area.state}
                          {area.latestReportAt ? ` · reported ${timeAgo(area.latestReportAt)}` : ' · no recent reports'}
                        </span>
                      </span>
                      {area.status ? (
                        <span className={`status-token status-token--${meta.tone}`}>
                          <span className="chip__dot" aria-hidden="true" />
                          {meta.label}
                        </span>
                      ) : (
                        <span className="status-token" style={{ color: 'var(--subtle)' }}>
                          Supported
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
