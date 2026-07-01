import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
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
    path: '/profile',
    name: 'profile',
    component: () => import('@/modules/profile/pages/ProfilePage.vue'),
    meta: { layout: 'default' },
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
    meta: { layout: 'default' },
  },
  {
    path: '/interviewer/session/:id',
    name: 'conduct-interview',
    component: () => import('@/modules/interviewers/pages/ConductInterviewPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/interviewer/analytics',
    name: 'interviewer-analytics',
    component: () => import('@/modules/interviewers/pages/InterviewerAnalyticsPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/applications',
    name: 'applications',
    component: () => import('@/modules/applications/pages/ApplicationsPage.vue'),
    meta: { layout: 'default' },
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
    meta: { layout: 'default' },
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
    meta: { layout: 'default' },
  },
  {
    path: '/endorsements/add',
    name: 'add-endorsement',
    component: () => import('@/modules/endorsements/pages/AddEndorsementPage.vue'),
    meta: { layout: 'default' },
  },

  // ===== Admin =====
  {
    path: '/admin',
    name: 'admin-dashboard',
    component: () => import('@/modules/admin/pages/AdminDashboardPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('@/modules/team/pages/UsersPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/admin/roles',
    name: 'admin-roles',
    component: () => import('@/modules/team/pages/RolesPage.vue'),
    meta: { layout: 'default' },
  },

  // ===== Surveys =====
  {
    path: '/surveys',
    name: 'surveys',
    component: () => import('@/modules/surveys/pages/SurveysPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/surveys/:id/analysis',
    name: 'survey-analysis',
    component: () => import('@/modules/surveys/pages/SurveyAnalysisPage.vue'),
    meta: { layout: 'default' },
  },

  // ===== Company =====
  {
    path: '/company/opportunities/create',
    name: 'create-opportunity',
    component: () => import('@/modules/opportunities/pages/CreateOpportunityPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/company/candidates',
    name: 'candidates',
    component: () => import('@/modules/candidates/pages/CandidatesPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/company/candidates/:id',
    name: 'candidate-profile',
    component: () => import('@/modules/candidates/pages/CandidateProfilePage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/company/wishes',
    name: 'company-wishes',
    component: () => import('@/modules/wishes/pages/CompanyWishesPage.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/company/analytics',
    name: 'analytics',
    component: () => import('@/modules/analytics/pages/AnalyticsPage.vue'),
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
