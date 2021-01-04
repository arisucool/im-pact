import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrainingDialogComponent } from './training-dialog.component';

describe('TrainingDialogComponent', () => {
  let component: TrainingDialogComponent;
  let fixture: ComponentFixture<TrainingDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TrainingDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TrainingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
