const GeneratePageDots = (
  currentPage: number,
  totalPages: number
): (number | string)[] => {
  const pages: (number | string)[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }

  // Show ellipsis after
  if (currentPage > 2) {
    pages.push("...");
  }

  // Middle range
  for (
    let i = Math.max(1, currentPage - 1);
    i <= Math.min(totalPages, currentPage + 1);
    i++
  ) {
    pages.push(i);
  }

  // Show ellipsis after
  if (currentPage < totalPages - 3) {
    pages.push("...");
  }

  return pages;
};

export default GeneratePageDots;