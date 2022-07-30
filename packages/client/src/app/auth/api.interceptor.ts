import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // セッション情報を LocalStorage から読み出し
    const currentAccessToken = window.localStorage.getItem('im_pact_token');

    if (currentAccessToken) {
      req = req.clone({
        setHeaders: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Authorization: `Bearer ${currentAccessToken}`,
        },
      });
    }

    console.log('[ApiInterceptor] intercept', req);
    return next.handle(req);
  }
}
