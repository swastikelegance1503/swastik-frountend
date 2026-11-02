import { ChartBarIcon } from '@heroicons/react/24/outline';
import StatsUpIcon from 'assets/dualicons/stats-up.svg?react';
import { NAV_TYPE_ROOT, NAV_TYPE_ITEM } from 'constants/app.constant';

export const productionNavigation = {
    id: 'production',
    type: NAV_TYPE_ROOT,
    path: '/production',
    title: 'પ્રોડક્શન & પગાર (Production)',
    Icon: StatsUpIcon,
    childs: [
        {
            id: 'production.summary',
            path: '/production',
            type: NAV_TYPE_ITEM,
            title: 'પ્રોડક્શન & સેલેરી હિસાબ (Production & Salary)',
            Icon: ChartBarIcon,
        },
    ]
};
