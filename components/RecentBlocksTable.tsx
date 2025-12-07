
import React from 'react';
import { BlockData } from '../types';

interface RecentBlocksTableProps {
  blocks: BlockData[];
}

const RecentBlocksTable: React.FC<RecentBlocksTableProps> = ({ blocks }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md h-full">
      <h3 className="text-lg font-semibold text-gray-300 mb-4">Recent Blocks</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Block #
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Timestamp
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Transactions
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Gas Used
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {blocks.map((block) => (
              <tr key={block.blockNumber} className="hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                  {block.blockNumber.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {block.timestamp}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {block.transactions.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {block.gasUsed.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentBlocksTable;
