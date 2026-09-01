module.exports = (objectPagination, query, countProducts) => {
    const totalPage = Math.ceil(countProducts/objectPagination.limitItem);
    objectPagination.totalPage = totalPage;
    const requestedPage = Number.parseInt(query.page, 10);
    objectPagination.currentPage = Number.isInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1;
    if (totalPage > 0 && objectPagination.currentPage > totalPage) {
        objectPagination.currentPage = totalPage;
    }
    objectPagination.skip = (objectPagination.currentPage - 1) * objectPagination.limitItem;

    return objectPagination;
}
