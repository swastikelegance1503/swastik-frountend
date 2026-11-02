import { UserGroupIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import ApplicationsIcon from 'assets/dualicons/applications.svg?react';
import { NAV_TYPE_ROOT, NAV_TYPE_ITEM } from 'constants/app.constant';

export const workers = {
    id: 'workers',
    type: NAV_TYPE_ROOT,
    path: '/workers',
    title: 'કારીગરો (Workers)',
    Icon: ApplicationsIcon,
    childs: [
        {
            id: 'workers.list',
            path: '/workers',
            type: NAV_TYPE_ITEM,
            title: 'કારીગરોની યાદી (Workers Directory)',
            Icon: UserGroupIcon,
        },
        {
            id: 'workers.salary',
            path: '/workers/salary',
            type: NAV_TYPE_ITEM,
            title: 'સેલેરી મેનેજમેન્ટ (Salary Management)',
            Icon: BanknotesIcon,
        },
    ]
};

