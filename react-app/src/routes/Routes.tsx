import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from '../theme/AppLayout';
import LoginView from '../views/LoginView';
import NotFoundView from '../views/NotFoundView';
import WelcomeView from '../views/WelcomeView';
import ProfileView from '../views/ProfileView';
import ProtectedRoute from './ProtectedRoute';
import NewUserLandingView from '../views/NewUserLandingView';
import PasswordResetView from '../views/PasswordResetView';
import BaseExpenseListView from '../views/BaseExpenseListView';
import BaseExpenseStatsView from '../views/BaseExpenseStatsView';
import PurchaseListView from '../views/PurchaseListView';
import BaseManagementView from '../views/BaseManagementView';
import BaseSectionManagementView from '../views/BaseSectionManagementView';
import UserManagementView from '../views/UserManagementView';
import PayableUnifiedView from '../views/PayableUnifiedView';
import SupplierManagementView from '../views/SupplierManagementView';
import { ADMIN_ROLE } from '../utils/roles';

/**
 * 项目所有页面路由配置，含权限校验。可根据业务扩展。
 */
const App = () => {
  return (
    <Router>
      <Routes>
        {/* 公共路由 */}
        <Route path="/login" element={<LoginView />} />
        <Route path="/welcome" element={<NewUserLandingView />} />

        {/* 受保护路由（需登录） */}
        <Route element={<ProtectedRoute />}> 
          <Route path="/account/update-password" element={<PasswordResetView />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<WelcomeView />} />
            <Route path="profile" element={<ProfileView />} />
            {/* 基地日常开支（所有登录用户，有录入/查看权限） */}
            <Route path="expense/list" element={<BaseExpenseListView />} />
            {/* 应付款管理（合并了原来的应付款管理和欠款统计功能） */}
            <Route path="payable/list" element={<PayableUnifiedView />} />
            <Route path="payable/stats" element={<PayableUnifiedView />} />
            {/* 供应商管理 */}
            <Route path="supplier/management" element={<SupplierManagementView />} />
            {/* ONLY admin 见统计分析和采购管理，采用roles嵌套路由 */}
            <Route element={<ProtectedRoute roles={[ADMIN_ROLE]} />}> 
              <Route path="expense/stats" element={<BaseExpenseStatsView />} />
              <Route path="purchase/list" element={<PurchaseListView />} />
              <Route path="base/management" element={<BaseManagementView />} />
              <Route path="base/section-management" element={<BaseSectionManagementView />} />
              <Route path="user/management" element={<UserManagementView />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundView />} />
      </Routes>
    </Router>
  );
};

export default App;