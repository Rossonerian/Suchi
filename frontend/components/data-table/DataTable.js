import { useMemo } from 'react';
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, Columns3, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const tableFeaturesConfig = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowSelectionFeature,
  columnVisibilityFeature,
});

export default function DataTable({ columns, data, searchPlaceholder = 'Filter rows…', onRowClick, emptyMessage = 'No matching records.', emptyAction }) {
  const stableData = useMemo(() => data || [], [data]);
  const table = useTable({
    features: tableFeaturesConfig,
    columns,
    data: stableData,
    getRowId: (row) => row._id || row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });
  const rows = table.getRowModel().rows;
  const selectedCount = table.getSelectedRowModel().rows.length;

  return (
    <div className="data-table" aria-label="Data table">
      <div className="data-table-controls">
        <label className="data-table-search">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search aria-hidden="true" />
          <Input value={table.state.globalFilter || ''} onChange={(event) => table.setGlobalFilter(event.target.value)} placeholder={searchPlaceholder} type="search" />
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline"><Columns3 />Columns</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table.getAllLeafColumns().filter((column) => column.getCanHide()).map((column) => (
              <DropdownMenuCheckboxItem key={column.id} checked={column.getIsVisible()} onCheckedChange={(visible) => column.toggleVisibility(Boolean(visible))}>
                {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {selectedCount > 0 && <p className="data-table-selection" role="status">{selectedCount} row{selectedCount === 1 ? '' : 's'} selected</p>}
      <div className="data-table-wrap">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => <TableHead key={header.id} scope="col" aria-sort={header.column.getIsSorted() === 'asc' ? 'ascending' : header.column.getIsSorted() === 'desc' ? 'descending' : header.column.getCanSort() ? 'none' : undefined}>
                {header.isPlaceholder ? null : header.column.getCanSort() ? <Button variant="ghost" size="sm" aria-label={`Sort by ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : header.column.id}; currently ${header.column.getIsSorted() === 'asc' ? 'ascending' : header.column.getIsSorted() === 'desc' ? 'descending' : 'not sorted'}`} onClick={header.column.getToggleSortingHandler()}>{<table.FlexRender header={header} />}{header.column.getIsSorted() === 'asc' ? <ChevronUp aria-hidden="true" /> : header.column.getIsSorted() === 'desc' ? <ChevronDown aria-hidden="true" /> : null}</Button> : <table.FlexRender header={header} />}
              </TableHead>)}
            </TableRow>)}
          </TableHeader>
          <TableBody>
            {rows.length ? rows.map((row, index) => <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'} style={{ '--row-index': index }} className={`${onRowClick ? 'data-table-row-clickable ' : ''}data-table-row-animated`} onClick={(event) => { if (!event.target.closest('button,input,a,select')) onRowClick?.(row.original); }}>
              {row.getVisibleCells().map((cell) => <TableCell key={cell.id} data-label={typeof cell.column.columnDef.header === 'string' ? cell.column.columnDef.header : cell.column.id}><table.FlexRender cell={cell} /></TableCell>)}
            </TableRow>) : <TableRow><TableCell colSpan={table.getVisibleLeafColumns().length} className="data-table-empty-cell h-32 text-center text-muted-foreground"><p>{emptyMessage}</p><div className="mt-3">{table.state.globalFilter ? <Button variant="outline" size="sm" onClick={() => table.setGlobalFilter('')}>Clear table search</Button> : emptyAction}</div></TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <div className="data-table-pagination">
        <span>{rows.length} of {table.getFilteredRowModel().rows.length} rows</span>
        <div>
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          <span>Page {table.state.pagination.pageIndex + 1} of {table.getPageCount()}</span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      </div>
    </div>
  );
}
