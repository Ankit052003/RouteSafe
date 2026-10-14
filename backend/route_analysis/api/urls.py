from django.urls import path

from .views import create_route_analysis, health


urlpatterns = [
    path("health/", health, name="health"),
    path("route-analyses/", create_route_analysis, name="route-analysis"),
]
