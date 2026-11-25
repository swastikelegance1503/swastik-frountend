import { NAV_TYPE_ITEM } from "constants/app.constant";
import DashboardsIcon from 'assets/dualicons/dashboards.svg?react';
import FormsIcon from 'assets/dualicons/forms.svg?react';
import TableIcon from 'assets/dualicons/table.svg?react';

export const baseNavigation = [
    {
        id: 'dashboards',
        type: NAV_TYPE_ITEM,
        path: '/dashboards',
        title: 'ફર્મ પ્રોફાઇલ (Firm Profiles)',
        Icon: DashboardsIcon,
    },
    {
        id: 'challans',
        type: NAV_TYPE_ITEM,
        path: '/dashboards/challans',
        title: 'ચલાણ / બિલિંગ (Challans)',
        Icon: FormsIcon,
    },
    {
        id: 'merchants',
        type: NAV_TYPE_ITEM,
        path: '/merchants',
        title: 'વેપારીઓ (Merchants)',
        Icon: TableIcon,
    },
];
