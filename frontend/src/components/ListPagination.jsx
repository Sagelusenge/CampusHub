import { ChevronLeft, ChevronRight } from 'lucide-react';

export function ListPagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizes = [10, 20, 30, 50] }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const first = total ? ((currentPage - 1) * pageSize) + 1 : 0;
  const last = Math.min(currentPage * pageSize, total);

  return (
    <div className="list-pagination">
      <label>
        Afficher
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          {pageSizes.map((size) => <option value={size} key={size}>{size}</option>)}
        </select>
        éléments
      </label>
      <span>{first}–{last} sur {total}</span>
      <div>
        <button type="button" aria-label="Page précédente" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}><ChevronLeft />Précédent</button>
        <strong>{currentPage} / {pageCount}</strong>
        <button type="button" aria-label="Page suivante" disabled={currentPage >= pageCount} onClick={() => onPageChange(currentPage + 1)}>Suivant<ChevronRight /></button>
      </div>
    </div>
  );
}
