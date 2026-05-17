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
        path: 'questions',
        name: 'QuestionList',
        component: () => import('@/views/question/QuestionListView.vue'),
        meta: {
          title: '题库'
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
        path: 'questions/:id',
        name: 'QuestionDetail',
        component: () => import('@/views/question/QuestionDetailView.vue'),
        meta: {
          title: '题目详情'
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
        path: 'study-plans',
        name: 'StudyPlans',
        component: () => import('@/views/study/StudyPlanView.vue'),
        meta: {
          title: '学习计划'
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
          affix: true
        }
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/UserManageView.vue'),
        meta: {
          title: '用户管理',
          icon: 'UserFilled'
        }
      },
      {
        path: 'roles',
        name: 'AdminRoles',
        component: () => import('@/views/admin/RoleManageView.vue'),
        meta: {
          title: '角色管理',
          icon: 'Connection'
        }
      },
      {
        path: 'questions',
        name: 'AdminQuestions',
        component: () => import('@/views/admin/QuestionManageView.vue'),
        meta: {
          title: '题目管理',
          icon: 'Collection'
        }
      },
      {
        path: 'question-categories',
        name: 'AdminQuestionCategories',
        component: () => import('@/views/admin/QuestionCategoryManageView.vue'),
        meta: {
          title: '分类管理',
          icon: 'Files'
        }
      },
      {
        path: 'question-tags',
        name: 'AdminQuestionTags',
        component: () => import('@/views/admin/QuestionTagManageView.vue'),
        meta: {
          title: '标签管理',
          icon: 'PriceTag'
        }
      },
      {
        path: 'question-groups',
        name: 'AdminQuestionGroups',
        component: () => import('@/views/admin/QuestionGroupManageView.vue'),
        meta: {
          title: '问题组管理',
          icon: 'List'
        }
      },
      {
        path: 'industry-templates',
        name: 'AdminIndustryTemplates',
        component: () => import('@/views/admin/IndustryTemplateManageView.vue'),
        meta: {
          title: '行业模板',
          icon: 'List'
        }
      },
      {
        path: 'files',
        name: 'AdminFiles',
        component: () => import('@/views/admin/AdminFileManageView.vue'),
        meta: {
          title: '\u6587\u4ef6\u6cbb\u7406',
          icon: 'Folder'
        }
      },
      {
        path: 'ai/prompts',
        name: 'AdminAiPrompts',
        component: () => import('@/views/admin/PromptTemplateView.vue'),
        meta: {
          title: 'Prompt 模板',
          icon: 'Operation'
        }
      },
      {
        path: 'ai/logs',
        name: 'AdminAiLogs',
        component: () => import('@/views/admin/AiCallLogView.vue'),
        meta: {
          title: 'AI 调用日志',
          icon: 'DataAnalysis'
        }
      },
      {
        path: 'system/configs',
        name: 'AdminSystemConfigs',
        component: () => import('@/views/admin/SystemConfigView.vue'),
        meta: {
          title: '系统配置',
          icon: 'Setting'
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  }
]
