import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: {
      public: true,
      title: '登录'
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: {
      public: true,
      title: '注册'
    }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: {
      public: true,
      title: '找回密码'
    }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/auth/ResetPasswordView.vue'),
    meta: {
      public: true,
      title: '重置密码'
    }
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/ForbiddenView.vue'),
    meta: {
      public: true,
      title: '无权限'
    }
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/NotFoundView.vue'),
    meta: {
      public: true,
      title: '页面不存在'
    }
  },
  {
    path: '/',
    component: () => import('@/layouts/UserLayout.vue'),
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/user/DashboardView.vue'),
        meta: {
          title: '工作台'
        }
      },
      {
        path: 'dashboard/v3',
        name: 'V3Dashboard',
        component: () => import('@/views/v3/V3DashboardView.vue'),
        meta: {
          title: 'V3 驾驶舱'
        }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/user/ProfileView.vue'),
        meta: {
          title: '个人资料'
        }
      },
      {
        path: 'password',
        name: 'Password',
        component: () => import('@/views/user/PasswordView.vue'),
        meta: {
          title: '修改密码'
        }
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/views/user/NotificationCenterView.vue'),
        meta: {
          title: '通知中心'
        }
      },
      {
        path: 'weakness-analysis',
        name: 'WeaknessAnalysis',
        component: () => import('@/views/user/WeaknessAnalysisView.vue'),
        meta: {
          title: '薄弱知识点分析'
        }
      },
      {
        path: 'projects',
        name: 'ProjectExperience',
        component: () => import('@/views/user/ProjectExperienceView.vue'),
        meta: {
          title: '项目经历'
        }
      },
      {
        path: 'questions',
        name: 'QuestionList',
        component: () => import('@/views/question/QuestionListView.vue'),
        meta: {
          title: '题库'
        }
      },
      {
        path: 'questions/practice',
        name: 'QuestionPractice',
        component: () => import('@/views/question/PracticeModeView.vue'),
        meta: {
          title: '刷题练习'
        }
      },
      {
        path: 'questions/wrong-records',
        name: 'WrongQuestions',
        component: () => import('@/views/question/WrongQuestionView.vue'),
        meta: {
          title: '错题本'
        }
      },
      {
        path: 'questions/favorites',
        name: 'FavoriteQuestions',
        component: () => import('@/views/question/FavoriteQuestionView.vue'),
        meta: {
          title: '收藏题目'
        }
      },
      {
        path: 'questions/recommendations',
        name: 'QuestionRecommendations',
        component: () => import('@/views/v3/QuestionRecommendationsView.vue'),
        meta: {
          title: '推荐题目'
        }
      },
      {
        path: 'questions/:id',
        name: 'QuestionDetail',
        component: () => import('@/views/question/QuestionDetailView.vue'),
        meta: {
          title: '题目详情'
        }
      },
      {
        path: 'job-targets',
        name: 'JobTargets',
        component: () => import('@/views/v3/JobTargetListView.vue'),
        meta: {
          title: '岗位目标'
        }
      },
      {
        path: 'job-targets/create',
        name: 'JobTargetCreate',
        component: () => import('@/views/v3/JobTargetEditView.vue'),
        meta: {
          title: '创建岗位目标'
        }
      },
      {
        path: 'job-targets/:id/edit',
        name: 'JobTargetEdit',
        component: () => import('@/views/v3/JobTargetEditView.vue'),
        meta: {
          title: '编辑岗位目标'
        }
      },
      {
        path: 'job-targets/:id/analysis',
        name: 'JobTargetAnalysis',
        component: () => import('@/views/v3/JobTargetAnalysisView.vue'),
        meta: {
          title: 'JD 分析'
        }
      },
      {
        path: 'resumes',
        name: 'ResumeList',
        component: () => import('@/views/resume/ResumeListView.vue'),
        meta: {
          title: '简历'
        }
      },
      {
        path: 'resumes/create',
        name: 'ResumeCreate',
        component: () => import('@/views/resume/ResumeEditView.vue'),
        meta: {
          title: '新建简历'
        }
      },
      {
        path: 'resumes/:id/edit',
        name: 'ResumeEdit',
        component: () => import('@/views/resume/ResumeEditView.vue'),
        meta: {
          title: '编辑简历'
        }
      },
      {
        path: 'resume-match',
        name: 'ResumeMatch',
        component: () => import('@/views/v3/ResumeMatchView.vue'),
        meta: {
          title: '简历匹配'
        }
      },
      {
        path: 'resume-match/:id',
        name: 'ResumeMatchDetail',
        component: () => import('@/views/v3/ResumeMatchDetailView.vue'),
        meta: {
          title: '匹配报告详情'
        }
      },
      {
        path: 'skill-profile',
        name: 'SkillProfile',
        component: () => import('@/views/v3/SkillProfileView.vue'),
        meta: {
          title: '能力画像'
        }
      },
      {
        path: 'interviews/create',
        name: 'InterviewCreate',
        component: () => import('@/views/interview/InterviewCreateView.vue'),
        meta: {
          title: '创建面试'
        }
      },
      {
        path: 'interviews/room/:id',
        name: 'InterviewRoom',
        component: () => import('@/views/interview/InterviewRoomView.vue'),
        meta: {
          title: '面试房间'
        }
      },
      {
        path: 'interviews/history',
        name: 'InterviewHistory',
        component: () => import('@/views/interview/InterviewHistoryView.vue'),
        meta: {
          title: '面试历史'
        }
      },
      {
        path: 'interviews/:id',
        name: 'InterviewDetail',
        component: () => import('@/views/interview/InterviewDetailView.vue'),
        meta: {
          title: '面试详情'
        }
      },
      {
        path: 'interviews/:id/report',
        name: 'InterviewReport',
        component: () => import('@/views/interview/InterviewReportView.vue'),
        meta: {
          title: '面试报告'
        }
      },
      {
        path: 'study-plans/from-gap',
        name: 'StudyPlansFromGap',
        component: () => import('@/views/v3/StudyPlanFromGapView.vue'),
        meta: {
          title: '差距学习计划'
        }
      },
      {
        path: 'study-plans',
        name: 'StudyPlans',
        component: () => import('@/views/study/StudyPlanView.vue'),
        meta: {
          title: '学习计划'
        }
      },
      {
        path: 'daily-tasks',
        name: 'DailyTasks',
        component: () => import('@/views/study/DailyTaskView.vue'),
        meta: {
          title: '每日任务'
        }
      }
    ]
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: '后台管理'
    },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/AdminDashboardView.vue'),
        meta: {
          title: '管理首页',
          icon: 'DataBoard',
          affix: true,
          requiredPermissions: ['admin:v3']
        }
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/UserManageView.vue'),
        meta: {
          title: '用户管理',
          icon: 'UserFilled',
          requiredPermissions: ['admin:user:list']
        }
      },
      {
        path: 'roles',
        name: 'AdminRoles',
        component: () => import('@/views/admin/RoleManageView.vue'),
        meta: {
          title: '角色管理',
          icon: 'Connection',
          requiredPermissions: ['admin:role:list']
        }
      },
      {
        path: 'questions',
        name: 'AdminQuestions',
        component: () => import('@/views/admin/QuestionManageView.vue'),
        meta: {
          title: '题目管理',
          icon: 'Collection',
          requiredPermissions: ['admin:question:list']
        }
      },
      {
        path: 'ai/questions/generate',
        name: 'AdminAiQuestionGenerate',
        component: () => import('@/views/admin/QuestionManageView.vue'),
        props: {
          initialGovernanceTab: 'generate'
        },
        meta: {
          title: 'AI 题目生成',
          icon: 'Operation',
          requiredPermissions: ['admin:question:generate']
        }
      },
      {
        path: 'question-reviews',
        name: 'AdminQuestionReviews',
        component: () => import('@/views/admin/QuestionManageView.vue'),
        props: {
          initialGovernanceTab: 'reviews'
        },
        meta: {
          title: '题目审核',
          icon: 'DataAnalysis',
          requiredPermissions: ['admin:question:review']
        }
      },
      {
        path: 'question-duplicate-reviews',
        name: 'AdminQuestionDuplicateReviews',
        component: () => import('@/views/admin/QuestionManageView.vue'),
        props: {
          initialGovernanceTab: 'duplicates'
        },
        meta: {
          title: '题目去重审核',
          icon: 'Connection',
          requiredPermissions: ['admin:question:dedupe']
        }
      },
      {
        path: 'question-relations',
        name: 'AdminQuestionRelations',
        component: () => import('@/views/admin/QuestionRelationManageView.vue'),
        meta: {
          title: '题目关系管理',
          icon: 'Share',
          requiredPermissions: ['admin:question:relation']
        }
      },
      {
        path: 'question-categories',
        name: 'AdminQuestionCategories',
        component: () => import('@/views/admin/QuestionCategoryManageView.vue'),
        meta: {
          title: '分类管理',
          icon: 'Files',
          requiredPermissions: ['admin:question:category']
        }
      },
      {
        path: 'question-tags',
        name: 'AdminQuestionTags',
        component: () => import('@/views/admin/QuestionTagManageView.vue'),
        meta: {
          title: '标签管理',
          icon: 'PriceTag',
          requiredPermissions: ['admin:question:tag']
        }
      },
      {
        path: 'question-groups',
        name: 'AdminQuestionGroups',
        component: () => import('@/views/admin/QuestionGroupManageView.vue'),
        meta: {
          title: '问题组管理',
          icon: 'List',
          requiredPermissions: ['admin:question:group']
        }
      },
      {
        path: 'industry-templates',
        name: 'AdminIndustryTemplates',
        component: () => import('@/views/admin/IndustryTemplateManageView.vue'),
        meta: {
          title: '行业模板',
          icon: 'List',
          requiredPermissions: ['admin:industry-template:list']
        }
      },
      {
        path: 'files',
        name: 'AdminFiles',
        component: () => import('@/views/admin/AdminFileManageView.vue'),
        meta: {
          title: '\u6587\u4ef6\u6cbb\u7406',
          icon: 'Folder',
          requiredPermissions: ['admin:file:list']
        }
      },
      {
        path: 'ai/prompts',
        name: 'AdminAiPrompts',
        component: () => import('@/views/admin/PromptTemplateView.vue'),
        meta: {
          title: 'Prompt 模板',
          icon: 'Operation',
          requiredPermissions: ['admin:ai:prompt:list']
        }
      },
      {
        path: 'ai/logs',
        name: 'AdminAiLogs',
        component: () => import('@/views/admin/AiCallLogView.vue'),
        meta: {
          title: 'AI 调用日志',
          icon: 'DataAnalysis',
          requiredPermissions: ['admin:ai:log:list']
        }
      },
      {
        path: 'system/configs',
        name: 'AdminSystemConfigs',
        component: () => import('@/views/admin/SystemConfigView.vue'),
        meta: {
          title: '系统配置',
          icon: 'Setting',
          requiredPermissions: ['admin:system:config:list']
        }
      },
      {
        path: 'ai/models',
        name: 'AdminAiModels',
        component: () => import('@/views/admin/AiModelConfigView.vue'),
        meta: {
          title: 'AI 模型配置',
          icon: 'Operation',
          requiredPermissions: ['admin:ai:model:list']
        }
      },
      {
        path: 'menus',
        name: 'AdminMenus',
        component: () => import('@/views/admin/MenuPermissionView.vue'),
        meta: {
          title: '菜单权限',
          icon: 'Lock',
          requiredPermissions: ['admin:menu:list']
        }
      },
      {
        path: 'notices',
        name: 'AdminNotices',
        component: () => import('@/views/admin/NotificationManageView.vue'),
        meta: {
          title: '通知管理',
          icon: 'Bell',
          requiredPermissions: ['admin:notice:list']
        }
      },
      {
        path: 'notifications',
        redirect: '/admin/notices',
        meta: {
          hidden: true
        }
      },
      {
        path: 'operation-logs',
        name: 'AdminOperationLogs',
        component: () => import('@/views/admin/OperationLogView.vue'),
        meta: {
          title: '操作日志',
          icon: 'Document',
          requiredPermissions: ['admin:audit:operation-log']
        }
      },
      {
        path: 'login-logs',
        name: 'AdminLoginLogs',
        component: () => import('@/views/admin/LoginLogView.vue'),
        meta: {
          title: '登录日志',
          icon: 'Key',
          requiredPermissions: ['admin:audit:login-log']
        }
      },
      {
        path: 'interviews',
        name: 'AdminInterviews',
        component: () => import('@/views/admin/InterviewManageView.vue'),
        meta: {
          title: '面试记录管理',
          icon: 'ChatDotRound',
          requiredPermissions: ['admin:interview:list']
        }
      },
      {
        path: 'interview-reports',
        name: 'AdminInterviewReports',
        component: () => import('@/views/admin/InterviewReportManageView.vue'),
        meta: {
          title: '面试报告管理',
          icon: 'Document',
          requiredPermissions: ['admin:interview:report']
        }
      },
      {
        path: 'async-tasks',
        name: 'AdminAsyncTasks',
        component: () => import('@/views/admin/AsyncTaskView.vue'),
        meta: {
          title: '异步任务',
          icon: 'Timer',
          requiredPermissions: ['admin:task:list']
        }
      },
      {
        path: 'tasks',
        redirect: '/admin/async-tasks',
        meta: {
          hidden: true
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  }
]
