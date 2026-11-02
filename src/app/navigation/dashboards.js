import { HomeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import DashboardsIcon from 'assets/dualicons/dashboards.svg?react';
import { NAV_TYPE_ROOT, NAV_TYPE_ITEM } from 'constants/app.constant';

const ROOT_DASHBOARDS = '/dashboards';

const path = (root, item) => `${root}${item}`;

export const dashboards = {
    id: 'dashboards',
    type: NAV_TYPE_ROOT,
    path: '/dashboards',
    title: 'ડેશબોર્ડ & એકાઉન્ટ (Dashboard)',
    Icon: DashboardsIcon,
    childs: [
        {
            id: 'dashboards.home',
            path: path(ROOT_DASHBOARDS, '/home'),
            type: NAV_TYPE_ITEM,
            title: 'ફર્મ પ્રોફાઇલ (Firm Profiles)',
            Icon: HomeIcon,
        },
        {
            id: 'dashboards.challans',
            path: path(ROOT_DASHBOARDS, '/challans'),
            type: NAV_TYPE_ITEM,
            title: 'ચલાણ & બિલિંગ (Challans & Bills)',
            Icon: DocumentTextIcon,
        },
    ]
};
