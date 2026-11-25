import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormationsSoumises } from './formations-soumises';

describe('FormationsSoumises', () => {
  let component: FormationsSoumises;
  let fixture: ComponentFixture<FormationsSoumises>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormationsSoumises],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormationsSoumises);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});