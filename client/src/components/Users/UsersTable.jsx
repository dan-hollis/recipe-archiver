import {
    flexRender,
    getCoreRowModel,
    useReactTable
} from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import LoadingSpinner from '../LoadingSpinner';

function UsersTable() {
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

    const columns = [
        {
            header: 'Username',
            accessorKey: 'username',
            cell: ({ row }) => (
                <Link 
                    to={`/profile/${row.original.id}`}
                    className="text-blue-600 hover:text-blue-800"
                >
                    {row.original.username}
                </Link>
            ),
        },
        {
            header: 'Role',
            accessorKey: 'role',
            cell: ({ row }) => (
                <span className={`px-2 py-1 rounded-full text-sm ${
                    row.original.role === 'admin' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-gray-100 text-gray-800'
                }`}>
                    {row.original.role}
                </span>
            ),
        },
        {
            header: 'Recipes Posted',
            accessorKey: 'recipe_count',
        },
        {
            header: 'Joined Date',
            accessorKey: 'joined_date',
            cell: ({ row }) => (
                <span>{new Date(row.original.joined_date).toLocaleDateString()}</span>
            ),
        },
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
            const json = await api.getUsersTable(
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
                    placeholder="Search users..."
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                            <tr 
                                key={row.id} 
                                className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                            >
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="border p-2 text-center">
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

export default UsersTable;