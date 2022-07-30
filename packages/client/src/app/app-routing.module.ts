import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './auth/login.component';
import { AuthGuard } from './guard/auth.guard';
import { SocialAccountsComponent } from './social-accounts/social-accounts.component';

const routes: Routes = [
  // ホーム
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  // ログイン
  { path: 'auth/login', component: LoginComponent },
  // トピックス
  { path: 'topics', loadChildren: './topics/topics.module#TopicsModule' },
  // ソーシャルアカウント
  { path: 'social-accounts', component: SocialAccountsComponent },
  { path: 'social-accounts/auth-callback/:serviceName', component: SocialAccountsComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
