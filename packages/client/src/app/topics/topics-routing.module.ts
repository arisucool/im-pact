import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TopicEditorComponent } from './topic-editor/topic-editor.component';
import { TopicDashboardComponent } from './topic-dashboard/topic-dashboard.component';

const routes: Routes = [
  { path: 'new', component: TopicEditorComponent },
  { path: ':id', component: TopicDashboardComponent },
  { path: ':id/edit', component: TopicEditorComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TopicsRoutingModule {}
