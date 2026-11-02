import { BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import TableIcon from 'assets/dualicons/table.svg?react';
import { NAV_TYPE_ROOT, NAV_TYPE_ITEM } from 'constants/app.constant';

export const merchants = {
    id: 'merchants',
    type: NAV_TYPE_ROOT,
    path: '/merchants',
    title: 'વેપારીઓ (Merchants)',
    Icon: TableIcon,
    childs: [
        {
            id: 'merchants.list',
            path: '/merchants',
            type: NAV_TYPE_ITEM,
            title: 'વેપારીઓની યાદી (All Merchants)',
            Icon: BuildingStorefrontIcon,
        },
    ]
};

