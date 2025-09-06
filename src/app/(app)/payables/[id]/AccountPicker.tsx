'use client';

import * as React from 'react';
import ComboboxAccount, { type AccountOpt } from '@/components/ComboboxAccount';

/**
 * Wrapper combobox -> hidden input "account_id"
 * Supaya server action tetap menerima number id.
 */
export default function AccountPicker({
  name = 'account_id',
  defaultId,
}: {
  name?: string;
  defaultId?: number | null;
}) {
  const [val, setVal] = React.useState<AccountOpt | null>(null);
  const hiddenRef = React.useRef<HTMLInputElement>(null);

  function onPick(next: AccountOpt | null) {
    setVal(next);
    if (hiddenRef.current) hiddenRef.current.value = next ? String(next.id) : '';
  }

  return (
    <>
      <ComboboxAccount value={val} onChange={onPick} placeholder="Pilih rekening bank..." />
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={defaultId ?? ''} />
    </>
  );
}
