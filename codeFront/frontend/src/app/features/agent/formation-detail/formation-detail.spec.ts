import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { FormationDetail } from './formation-detail';

describe('FormationDetail', () => {
  let component: FormationDetail;
  let fixture: ComponentFixture<FormationDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormationDetail],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FormationDetail);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});