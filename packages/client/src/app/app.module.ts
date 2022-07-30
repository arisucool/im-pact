import { BrowserModule } from '@angular/platform-browser';
import { forwardRef, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { HomeComponent } from './home/home.component';

import { ApiModule } from '../.api-client/api.module';
import { ApiInterceptor } from './auth/api.interceptor';

import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { LoginComponent } from './auth/login.component';
import { TopicsModule } from './topics/topics.module';
import { ConfirmDialogComponent } from './shared/confirm-dialog.component';
import { SocialAccountsComponent } from './social-accounts/social-accounts.component';

@NgModule({
  declarations: [AppComponent, HomeComponent, LoginComponent, ConfirmDialogComponent, SocialAccountsComponent],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    TopicsModule,

    // Angular Material
    BrowserAnimationsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatBottomSheetModule,
    MatChipsModule,
    MatCheckboxModule,
    MatCardModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatTabsModule,
    MatToolbarModule,
    MatTooltipModule,
    MatDatepickerModule,

    // API クライアント
    HttpClientModule,
    ApiModule.forRoot({
      rootUrl: '',
    }),
  ],
  providers: [
    // API クライアントの認証情報を設定するためのインタセプタ
    ApiInterceptor,
    {
      provide: HTTP_INTERCEPTORS,
      useExisting: forwardRef(() => ApiInterceptor),
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
