import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TopicEditorComponent } from './topic-editor/topic-editor.component';

const routes: Routes = [
  { path: 'new', component: TopicEditorComponent },
  { path: 'edit/:id', component: TopicEditorComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TopicsRoutingModule {}
