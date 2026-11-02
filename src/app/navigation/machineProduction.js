import { ChartBarSquareIcon } from '@heroicons/react/24/outline';
import PrototypesIcon from 'assets/dualicons/prototypes.svg?react';
import { NAV_TYPE_ROOT, NAV_TYPE_ITEM } from 'constants/app.constant';

export const machineProductionNavigation = {
    id: 'machine-production',
    type: NAV_TYPE_ROOT,
    path: '/machine-production',
    title: 'મશીન પ્રોડક્શન (Machine Production)',
    Icon: PrototypesIcon,
    childs: [
        {
            id: 'machine-production.daily',
            path: '/machine-production',
            type: NAV_TYPE_ITEM,
            title: 'મશીન પ્રોડક્શન (Daily Production)',
            Icon: ChartBarSquareIcon,
        },
    ]
};
