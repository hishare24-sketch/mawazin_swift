import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  // ===== أداة تطوير: معرض مكوّنات Tailwind (المرحلة 5) =====
  {
    path: '/ui-kit',
    name: 'ui-kit',
    component: () => import('@/modules/dev/pages/UiKitPage.vue'),
    meta: { layout: 'blank', public: true },
  },
  // ===== Public / Auth =====
  {
    path: '/login',
    name: 'login',
    component: () => import('@/modules/auth/pages/LoginPage.vue'),
    meta: { layout: 'forms', public: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/modules/auth/pages/RegisterPage.vue'),
    meta: { layout: 'forms', public: true },
  },

  // ===== Public explore (visitors) =====
  {
    path: '/explore/opportunities',
    name: 'explore-opportunities',
    component: () => import('@/modules/public/pages/PublicOpportunitiesPage.vue'),
    meta: { layout: 'blank', public: true },
  },
  {
    path: '/explore/assistant',
    name: 'explore-assistant',
    component: () => import('@/modules/public/pages/PublicAssistantPage.vue'),
    meta: { layout: 'blank', public: true },
  },
  {
    path: '/expert/:slug',
    name: 'public-expert',
    component: () => import('@/modules/public/pages/PublicExpertPage.vue'),
    meta: { layout: 'blank', public: true },
  },
  {
    path: '/u/:slug',
    name: 'public-user-profile',
    component: () => import('@/modules/public/pages/PublicUserProfilePage.vue'),
    meta: { layout: 'blank', public: true },
  },
  {
    path: '/resume/:token',
    name: 'public-resume',
    component: () => import('@/modules/public/pages/PublicResumePage.vue'),
    meta: { layout: 'blank', public: true },
  },
  {
    path: '/survey/:token',
    name: 'survey-answer',
    component: () => import('@/modules/surveys/pages/SurveyAnswerPage.vue'),
    meta: { layout: 'blank', public: true },
  },

  // ===== Public landing =====
  {
    path: '/',
    name: 'home',
    component: () => import('@/modules/public/pages/LandingPage.vue'),
    meta: { layout: 'blank', public: true },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/modules/dashboard/pages/DashboardPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/hub',
    name: 'unified-hub',
    component: () => import('@/modules/hub/pages/UnifiedHubPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/modules/profile/pages/ProfilePage.vue'),
    meta: { layout: 'default' },
  },
  // انتقل التحكم إلى مركز الإعدادات — المساران القديمان يحوّلان إليه فتبقى كل الروابط حيّة
  {
    path: '/plan',
    name: 'account-plan',
    redirect: { path: '/settings', query: { tab: 'plan' } },
  },
  {
    path: '/my-public-profile',
    name: 'public-profile-manage',
    redirect: { path: '/settings', query: { tab: 'publicProfile' } },
  },
  {
    path: '/reviews',
    name: 'reviews',
    component: () => import('@/modules/reviews/pages/ReviewsPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/modules/search/pages/SearchResultsPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/opportunities',
    name: 'opportunities',
    component: () => import('@/modules/opportunities/pages/OpportunitiesPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/opportunities/:id',
    name: 'opportunity-details',
    component: () => import('@/modules/opportunities/pages/OpportunityDetailsPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/requests',
    name: 'requests',
    component: () => import('@/modules/requests/pages/RequestsFeedPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/peer-requests',
    name: 'peer-requests',
    component: () => import('@/modules/peer-requests/pages/PeerRequestsPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/achievements',
    name: 'achievements',
    component: () => import('@/modules/achievements/pages/AchievementsPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/requests/mine',
    name: 'my-requests',
    component: () => import('@/modules/requests/pages/MyRequestsPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/requests/:id',
    name: 'request-details',
    component: () => import('@/modules/requests/pages/RequestDetailsPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/interviewers',
    name: 'interviewers',
    component: () => import('@/modules/interviewers/pages/InterviewersMarketplacePage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/interviewers/register',
    name: 'interviewer-register',
    component: () => import('@/modules/interviewers/pages/InterviewerRegisterPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/interviewers/:id',
    name: 'interviewer-profile',
    component: () => import('@/modules/interviewers/pages/InterviewerProfilePage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/interviewer',
    name: 'interviewer-dashboard',
    component: () => import('@/modules/interviewers/pages/InterviewerDashboardPage.vue'),
    meta: { layout: 'default', roles: ['interviewer'] },
  },
  {
    path: '/interviewer/session/:id',
    name: 'conduct-interview',
    component: () => import('@/modules/interviewers/pages/ConductInterviewPage.vue'),
    meta: { layout: 'default', roles: ['interviewer'] },
  },
  {
    path: '/interviewer/analytics',
    name: 'interviewer-analytics',
    component: () => import('@/modules/interviewers/pages/InterviewerAnalyticsPage.vue'),
    meta: { layout: 'default', roles: ['interviewer'] },
  },
  {
    path: '/applications',
    name: 'applications',
    component: () => import('@/modules/applications/pages/ApplicationsPage.vue'),
    meta: { layout: 'default', roles: ['seeker'] },
  },
  {
    path: '/wishes',
    name: 'wishes',
    component: () => import('@/modules/wishes/pages/WishesPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/assessments',
    name: 'assessments',
    component: () => import('@/modules/assessments/pages/AssessmentsPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/assessments/:id/take',
    name: 'assessment-take',
    component: () => import('@/modules/assessments/pages/TakeAssessmentPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/assessments/:id/result',
    name: 'assessment-result',
    component: () => import('@/modules/assessments/pages/AssessmentResultPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/interviews',
    name: 'interviews',
    component: () => import('@/modules/interviews/pages/InterviewsPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/interviews/session/:id',
    name: 'interview-session',
    component: () => import('@/modules/interviews/pages/InterviewSessionPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/interviews/:id/result',
    name: 'interview-result',
    component: () => import('@/modules/interviews/pages/InterviewResultPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/messages',
    name: 'messages',
    component: () => import('@/modules/messages/pages/MessagesPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/notifications',
    name: 'notifications',
    component: () => import('@/modules/notifications/pages/NotificationsPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/wallet',
    name: 'wallet',
    component: () => import('@/modules/wallet/pages/WalletPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/modules/settings/pages/SettingsPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/modules/onboarding/pages/OnboardingPage.vue'),
    meta: { layout: 'blank' },
  },
  {
    path: '/resume-builder',
    name: 'resume-builder',
    component: () => import('@/modules/resume-builder/pages/ResumeBuilderPage.vue'),
    meta: { layout: 'default', roles: ['seeker'] },
  },
  {
    path: '/assistant',
    name: 'assistant',
    component: () => import('@/modules/assistant/pages/AssistantPage.vue'),
    meta: { layout: 'default' },
  },

  // ===== Endorser =====
  {
    path: '/endorsements',
    name: 'endorser-home',
    component: () => import('@/modules/endorsements/pages/EndorserHomePage.vue'),
    meta: { layout: 'default', roles: ['endorser'] },
  },
  {
    path: '/endorsements/add',
    name: 'add-endorsement',
    component: () => import('@/modules/endorsements/pages/AddEndorsementPage.vue'),
    meta: { layout: 'default', roles: ['endorser'] },
  },

  // ===== Admin Console (كونسول مستقلّ) =====
  {
    path: '/admin',
    name: 'admin-overview',
    component: () => import('@/modules/admin/pages/AdminOverviewPage.vue'),
    meta: { layout: 'admin', roles: ['admin'], permission: 'view_analytics', title: 'admin.nav.overview' },
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('@/modules/admin/pages/AdminUsersPage.vue'),
    meta: { layout: 'admin', roles: ['admin'], permission: 'view_users', title: 'admin.nav.users' },
  },
  {
    path: '/admin/roles',
    name: 'admin-roles',
    component: () => import('@/modules/admin/pages/AdminRolesPage.vue'),
    meta: { layout: 'admin', roles: ['admin'], permission: 'view_roles', title: 'admin.nav.roles' },
  },
  {
    path: '/admin/opportunities',
    name: 'admin-opportunities',
    component: () => import('@/modules/admin/pages/AdminOpportunitiesPage.vue'),
    meta: { layout: 'admin', roles: ['admin'], permission: 'view_opportunities', title: 'admin.nav.opportunities' },
  },
  {
    path: '/admin/requests',
    name: 'admin-requests',
    component: () => import('@/modules/admin/pages/AdminRequestsPage.vue'),
    meta: { layout: 'admin', roles: ['admin'], permission: 'view_requests', title: 'admin.nav.requests' },
  },

  // ===== Ecosystem expert roles (coach / trainer / consultant) =====
  {
    path: '/people',
    name: 'people-explorer',
    component: () => import('@/modules/public/pages/PeopleExplorerPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/experts',
    name: 'experts-market',
    component: () => import('@/modules/experts/pages/ExpertsMarketPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/experts/:slug',
    name: 'expert-profile',
    component: () => import('@/modules/experts/pages/ExpertProfilePage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/join/:role(coach|trainer|consultant)',
    name: 'role-join',
    component: () => import('@/modules/experts/pages/RoleJoinWizardPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/coach',
    name: 'coach-dashboard',
    component: () => import('@/modules/experts/pages/CoachDashboardPage.vue'),
    meta: { layout: 'default', roles: ['coach'] },
  },
  {
    path: '/trainer',
    name: 'trainer-dashboard',
    component: () => import('@/modules/experts/pages/TrainerDashboardPage.vue'),
    meta: { layout: 'default', roles: ['trainer'] },
  },
  {
    path: '/consultant',
    name: 'consultant-dashboard',
    component: () => import('@/modules/experts/pages/ConsultantDashboardPage.vue'),
    meta: { layout: 'default', roles: ['consultant'] },
  },
  {
    path: '/governance',
    name: 'governance-dashboard',
    component: () => import('@/modules/governance/pages/GovernanceDashboardPage.vue'),
    meta: { layout: 'default', roles: ['content_reviewer', 'community_guide'] },
  },

  // ===== Surveys =====
  {
    path: '/surveys-center',
    name: 'surveys-hub',
    component: () => import('@/modules/surveys/pages/SurveysHubPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/surveys',
    name: 'surveys',
    component: () => import('@/modules/surveys/pages/SurveysPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/surveys/participate',
    name: 'surveys-participate',
    component: () => import('@/modules/surveys/pages/SurveysParticipatePage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/surveys/:id/analysis',
    name: 'survey-analysis',
    component: () => import('@/modules/surveys/pages/SurveyAnalysisPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/surveys/:id/admin',
    name: 'survey-admin',
    component: () => import('@/modules/surveys/pages/SurveyAdminPage.vue'),
    meta: { layout: 'default' },
  },

  // ===== Company =====
  {
    path: '/company/opportunities/create',
    name: 'create-opportunity',
    component: () => import('@/modules/opportunities/pages/CreateOpportunityPage.vue'),
    meta: { layout: 'default', roles: ['company'] },
  },
  {
    path: '/company/candidates',
    name: 'candidates',
    component: () => import('@/modules/candidates/pages/CandidatesPage.vue'),
    meta: { layout: 'default', roles: ['company'] },
  },
  {
    path: '/company/candidates/:id',
    name: 'candidate-profile',
    component: () => import('@/modules/candidates/pages/CandidateProfilePage.vue'),
    meta: { layout: 'default', roles: ['company'] },
  },
  {
    path: '/company/wishes',
    name: 'company-wishes',
    component: () => import('@/modules/wishes/pages/CompanyWishesPage.vue'),
    meta: { layout: 'default', roles: ['company'] },
  },
  {
    path: '/company/analytics',
    name: 'analytics',
    component: () => import('@/modules/analytics/pages/AnalyticsPage.vue'),
    meta: { layout: 'default', roles: ['company'] },
  },
  {
    path: '/analytics',
    name: 'unified-analytics',
    component: () => import('@/modules/analytics/pages/UnifiedAnalyticsPage.vue'),
    meta: { layout: 'default' },
  },

  // ===== Errors =====
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/modules/errors/pages/NotFoundPage.vue'),
    meta: { layout: 'blank', public: true },
  },
]
