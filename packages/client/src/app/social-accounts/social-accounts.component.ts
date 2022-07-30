import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SocialAccount } from 'src/.api-client/models/social-account';
import { ApiService } from 'src/.api-client/services/api.service';

@Component({
  selector: 'app-social-accounts',
  templateUrl: './social-accounts.component.html',
  styleUrls: ['./social-accounts.component.scss'],
})
export class SocialAccountsComponent implements OnInit {
  public socialAccounts: SocialAccount[];

  constructor(private apiService: ApiService, private activatedRoute: ActivatedRoute) {}

  async ngOnInit(): Promise<void> {
    await this.load();

    if (
      this.activatedRoute.snapshot.paramMap.get('serviceName') &&
      this.activatedRoute.snapshot.paramMap.get('serviceName') === 'twitter'
    ) {
      await this.catchCallbackForTwitterAccount();
    }
  }

  async load(): Promise<void> {
    this.socialAccounts = await this.apiService.socialAccountsControllerFindAll().toPromise();
  }

  async authTwitterAccount(): Promise<void> {
    const response = await this.apiService.socialAccountsControllerGetAuthUrlForTwitter().toPromise();
    window.localStorage.setItem('requestingTwitterOAuthTokenSecret', response.oAuthTokenSecret);
    window.open(response.authUrl, '_blank');
  }

  async catchCallbackForTwitterAccount(): Promise<void> {
    const oAuthTokenSecret = window.localStorage.getItem('requestingTwitterOAuthTokenSecret');

    const oAuthToken = this.activatedRoute.snapshot.queryParamMap.get('oauth_token');
    const oAuthVerifier = this.activatedRoute.snapshot.queryParamMap.get('oauth_verifier');
    console.log({
      oAuthToken: oAuthToken,
      oAuthVerifier: oAuthVerifier,
      oAuthTokenSecret: oAuthTokenSecret,
    });
    const response = await this.apiService
      .socialAccountsControllerSaveTwitterAccount({
        body: {
          oAuthToken: oAuthToken,
          oAuthVerifier: oAuthVerifier,
          oAuthTokenSecret: oAuthTokenSecret,
        },
      })
      .toPromise();

    await this.load();
  }
}
