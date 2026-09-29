'use client';

import React from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import styles from './SearchBar.module.css';

export interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  wrapperClassName = '',
  ...props
}: SearchBarProps) {
  return (
    <div className={`${styles.searchBar} ${wrapperClassName}`}>
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${styles.searchInput} ${className}`}
        {...props}
      />
      <MagnifyingGlass size={20} weight="bold" className={styles.searchIcon} aria-hidden="true" />
    </div>
  );
}
