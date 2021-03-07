import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './auth/login.component';
import { LicenseComponent } from './licenses/license.component';
import { AuthGuard } from './guard/auth.guard';

const routes: Routes = [
  // ホーム
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  // ログイン
  { path: 'auth/login', component: LoginComponent },
  // ライセンス情報
  { path: 'licenses', component: LicenseComponent },
  // トピックス
  { path: 'topics', loadChildren: './topics/topics.module#TopicsModule' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
