import { NAV_TYPE_ITEM } from "constants/app.constant";
import DashboardsIcon from 'assets/dualicons/dashboards.svg?react';
import FormsIcon from 'assets/dualicons/forms.svg?react';
import TableIcon from 'assets/dualicons/table.svg?react';
import ApplicationsIcon from 'assets/dualicons/applications.svg?react';
import ComponentsIcon from 'assets/dualicons/components.svg?react';
import PrototypesIcon from 'assets/dualicons/prototypes.svg?react';

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
    {
        id: 'workers',
        type: NAV_TYPE_ITEM,
        path: '/workers',
        title: 'કારીગરો (Workers)',
        Icon: ApplicationsIcon,
    },
    {
        id: 'workers-salary',
        type: NAV_TYPE_ITEM,
        path: '/workers/salary',
        title: 'સેલેરી મેનેજમેન્ટ (Salary Management)',
        Icon: ApplicationsIcon,
    },
    {
        id: 'machines',
        type: NAV_TYPE_ITEM,
        path: '/machines',
        title: 'મશીનો (Machines)',
        Icon: ComponentsIcon,
    },
    {
        id: 'machine-production',
        type: NAV_TYPE_ITEM,
        path: '/machine-production',
        title: 'મશીન પ્રોડક્શન (Machine Production)',
        Icon: PrototypesIcon,
    },
];
