import { TrashIcon } from '@heroicons/react/24/outline';
import {
    flexRender,
    getCoreRowModel,
    useReactTable
} from '@tanstack/react-table';
import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import { api } from '../../utils/api';
import LoadingSpinner from '../LoadingSpinner';

function RecipesTable() {
    const { user } = useContext(UserContext);
    const [data, setData] = useState([]);
    const [sorting, setSorting] = useState([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });
    const [totalRows, setTotalRows] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const columns = [
        {
            header: 'Name (source)',
            accessorKey: 'name',
        },
        {
            header: 'Recipe URL',
            accessorKey: 'recipe_link',
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <a 
                        href={row.original.link} 
                        className="inline-flex items-center px-3 py-1 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors duration-150"
                        rel="noopener noreferrer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Recipe
                    </a>
                </div>
            ),
            enableSorting: false,
        },
        {
            header: 'Source URL',
            accessorKey: 'recipe_source_url',
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <a 
                        href={row.original.source_url} 
                        className="inline-flex items-center px-3 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors duration-150"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Source
                    </a>
                </div>
            ),
            enableSorting: false,
        },
        ...(user?.role === 'admin' ? [{
            header: 'Delete',
            accessorKey: 'recipe_delete',
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <button 
                        onClick={() => handleDelete(row.original.id)}
                        className="inline-flex items-center px-3 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors duration-150"
                        title="Delete Recipe"
                    >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Delete
                    </button>
                </div>
            ),
            enableSorting: false,
        }] : []),
    ];

    const table = useReactTable({
        data,
        columns,
        pageCount: Math.ceil(totalRows / pagination.pageSize),
        state: {
            sorting,
            globalFilter,
            pagination,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        manualSorting: true,
        manualFiltering: true,
        manualPagination: true,
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const json = await api.getRecipesTable(
                pagination.pageIndex + 1,
                pagination.pageSize,
                globalFilter,
                sorting
            );
            setData(json.data);
            setTotalRows(json.total);
            setError(null);
        } catch (error) {
            setError('Failed to fetch data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [pagination.pageIndex, pagination.pageSize, sorting, globalFilter]);

    // Debounce the search input to prevent too many API calls
    const debouncedSearchChange = debounce((value) => {
        setGlobalFilter(value);
    }, 300);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this recipe?')) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.delete_recipe(id);
            if (response.success) {
                // Refresh the data
                fetchData();
            } else {
                setError('Failed to delete recipe');
            }
        } catch (error) {
            setError('Failed to delete recipe');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <input
                    type="text"
                    value={globalFilter}
                    onChange={e => setGlobalFilter(e.target.value)}
                    placeholder="Search recipes..."
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                    onClick={() => navigate('/recipes/add')}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                    Add Recipe
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                    <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th
                                        key={header.id}
                                        onClick={header.column.getToggleSortingHandler()}
                                        className={`p-2 ${
                                            header.column.getCanSort() 
                                                ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' 
                                                : ''
                                        }`}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                            {header.column.getCanSort() && (
                                                <span className="text-gray-500">
                                                    {header.column.getIsSorted() ? (
                                                        header.column.getIsSorted() === "asc" ? (
                                                            "↑"
                                                        ) : (
                                                            "↓"
                                                        )
                                                    ) : (
                                                        "↕"
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="border p-2">
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex items-center gap-2 mt-4">
                    <button
                        className="border rounded p-1"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                    >
                        {'<<'}
                    </button>
                    <button
                        className="border rounded p-1"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        {'<'}
                    </button>
                    <button
                        className="border rounded p-1"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        {'>'}
                    </button>
                    <button
                        className="border rounded p-1"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                    >
                        {'>>'}
                    </button>
                    <span className="flex items-center gap-1">
                        <div>Page</div>
                        <strong>
                            {table.getState().pagination.pageIndex + 1} of{' '}
                            {table.getPageCount()}
                        </strong>
                    </span>
                </div>
            </div>
            {error && <div className="text-red-500">{error}</div>}
        </div>
    );
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export default RecipesTable;
