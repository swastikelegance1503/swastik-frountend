import { CpuChipIcon } from '@heroicons/react/24/outline';
import ComponentsIcon from 'assets/dualicons/components.svg?react';
import { NAV_TYPE_ROOT, NAV_TYPE_ITEM } from 'constants/app.constant';

export const machinesNavigation = {
    id: 'machines',
    type: NAV_TYPE_ROOT,
    path: '/machines',
    title: 'મશીનો (Machines)',
    Icon: ComponentsIcon,
    childs: [
        {
            id: 'machines.list',
            path: '/machines',
            type: NAV_TYPE_ITEM,
            title: 'મશીનોની યાદી (All Machines)',
            Icon: CpuChipIcon,
        },
    ]
};

